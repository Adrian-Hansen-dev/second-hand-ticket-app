# Orchestrierung: Verkaufsvorgang

Der **Verkaufsservice** ist der Orchestrator der Saga. Er steuert die Reihenfolge
der Reservierungen und kennt als einziger Service den vollständigen Zustand eines
Verkaufsvorgangs. `saleId` ist ein vom Client erzeugter Idempotenzschlüssel; jede
Reservierung und jede Kompensation wird mit derselben `saleId` ausgeführt.

## Happy Path: Komponentendiagramm

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]
    PS[Produkt Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren| AS
    VS -->|3. Produkt verbindlich reservieren| PS
    VS -->|4. Konto belasten| AS
    VS -->|5. Limit abbuchen| LS
    VS -->|6. Bestand abbuchen| PS
```

Der Verkaufsservice ruft die Fachservices erst beim Checkout in dieser Reihenfolge
auf. Scheitert ein Reservierungsschritt, werden die zuvor erfolgreichen
Reservierungen in umgekehrter Reihenfolge freigegeben.

## Ablauf eines erfolgreichen Verkaufs

```mermaid
sequenceDiagram
    autonumber
    actor Kunde
    participant VS as Verkaufsservice (Orchestrator)
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    Kunde->>VS: POST /verkaeufe (saleId, customerId, productId, menge, betrag)
    VS->>VS: CHECKOUT_IN_PROGRESS und Lease speichern

    VS->>LS: reserveLimit(saleId, customerId, tag, betrag)
    Note right of LS: Kurzer Lock und Status LIMIT_RESERVED speichern
    LS-->>VS: RESERVED
    VS->>VS: Saga-Status LIMIT_RESERVED speichern

    VS->>AS: reserveFunds(saleId, customerId, betrag)
    Note right of AS: Atomar reservieren und Status FUNDS_RESERVED speichern
    AS-->>VS: RESERVED
    VS->>VS: Saga-Status FUNDS_RESERVED speichern

    VS->>PS: reserveStock(saleId, productId, menge)
    Note right of PS: Erste Anfrage gewinnt und Status STOCK_RESERVED speichern
    PS-->>VS: RESERVED
    VS->>VS: Saga-Status STOCK_RESERVED speichern

    VS->>AS: captureFunds(saleId)
    AS-->>VS: CONFIRMED
    VS->>VS: Saga-Status FUNDS_CAPTURED speichern
    VS->>LS: confirmLimit(saleId)
    LS-->>VS: CONFIRMED
    VS->>VS: Saga-Status LIMIT_CONFIRMED speichern
    VS->>PS: commitStock(saleId)
    PS-->>VS: CONFIRMED
    VS->>VS: Saga-Status COMPLETED speichern und Lease freigeben
    VS-->>Kunde: Verkauf bestaetigt

    Note over VS,PS: Recovery nutzt die gespeicherten Saga und Service Status
```

### Entscheidungen im Happy Path

- **Ein Checkout pro Account:** Der Verkaufsservice hält eine gespeicherte
  Checkout-Lease mit `saleId`. Ein zweiter Tab kann deshalb keinen parallelen
  Kauf starten; die Lease wird nach Abschluss, Fehler oder Ablauf freigegeben.
- **Verbindliche Reservierungen erst beim Checkout:** Eine Warenkorbprüfung ist
  unverbindlich. Beim Checkout reserviert der Limit Service zuerst unter einem
  kurzen Lock; danach reservieren Account und Produkt atomar. Damit gewinnt die
  erste erfolgreich verarbeitete Anfrage, ohne das Limit, Guthaben oder den
  Bestand zu überschreiten.
- **Produkt vor Abbuchung:** `reserveStock` sichert das Produkt für den Kunden.
  Erst danach wird Guthaben belastet; Limit und Bestand werden anschließend
  endgültig gebucht. Jeder Schritt und seine Antwort werden als Saga-Status
  gespeichert, damit ein Neustart den Ablauf fortsetzen kann.

## Fehlerpfad 1a: Account Service scheitert bei der Guthabenreservierung

Der Account Service liefert nach 10 ms einen nicht wiederholbaren Fehler bei
`reserveFunds`. Der ursprüngliche Aufruf wird nicht wiederholt, weil unklar ist,
ob der Service die Reservierung kurz vor dem Fehler bereits gespeichert hat.

### Komponentendiagramm

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren Fehler| AS
    VS -->|3. Limit freigeben| LS
    VS -->|4. Kompensation synchronisieren nach Recovery| AS
```

```mermaid
sequenceDiagram
    autonumber
    participant VS as Verkaufsservice
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    VS->>LS: reserveLimit(saleId)
    LS-->>VS: RESERVED
    VS->>VS: Saga LIMIT_RESERVED speichern

    VS->>AS: reserveFunds(saleId)
    AS-->>VS: ERROR nach 10 ms ohne Retry
    VS->>VS: Saga COMPENSATING speichern
    VS->>LS: releaseLimit(saleId)
    LS-->>VS: RELEASED
    VS->>VS: Limit kompensiert speichern
    VS->>VS: ACCOUNT_RECONCILIATION_PENDING speichern
    Note right of AS: Service ist nicht erreichbar
    VS->>AS: healthCheck bis Service wieder verfuegbar ist
    AS-->>VS: AVAILABLE
    VS->>AS: synchronizeCompensation(saleId)
    AS-->>VS: RELEASED oder NOT_RESERVED
    Note right of AS: Status FUNDS_RELEASED oder NOT_RESERVED speichern
    VS->>VS: Saga FAILED speichern und Lease freigeben
```

### Entscheidungen in Fehlerpfad 1a

- Die Limitreservierung wird sofort freigegeben, weil ihr Erfolg sicher bekannt
  ist.
- `reserveFunds` wird nicht wiederholt. Stattdessen wird
  `ACCOUNT_RECONCILIATION_PENDING` gespeichert, damit die Kompensation nicht bei
  einem Absturz verloren geht.
- Erst wenn Account Service wieder verfügbar ist, synchronisiert
  `synchronizeCompensation(saleId)` die möglicherweise entstandene Reservierung
  zu `FUNDS_RELEASED` oder `NOT_RESERVED`.

## Fehlerpfad 1b: Account Service scheitert beim Abbuchen

Hier waren Limit, Guthaben und Produkt bereits reserviert. Der Fehler bei
`captureFunds` bedeutet deshalb, dass alle drei Reservierungen kompensiert werden
müssen.

### Komponentendiagramm

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]
    PS[Produkt Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren| AS
    VS -->|3. Produkt reservieren| PS
    VS -->|4. Konto belasten Fehler| AS
    VS -->|5. Produkt freigeben| PS
    VS -->|6. Limit freigeben| LS
    VS -->|7. Kompensation synchronisieren nach Recovery| AS
```

```mermaid
sequenceDiagram
    autonumber
    participant VS as Verkaufsservice
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    VS->>LS: reserveLimit(saleId)
    LS-->>VS: RESERVED
    VS->>VS: Saga LIMIT_RESERVED speichern
    VS->>AS: reserveFunds(saleId)
    AS-->>VS: RESERVED
    VS->>VS: Saga FUNDS_RESERVED speichern
    VS->>PS: reserveStock(saleId)
    PS-->>VS: RESERVED
    VS->>VS: Saga STOCK_RESERVED speichern

    VS->>AS: captureFunds(saleId)
    AS-->>VS: ERROR nach 10 ms ohne Retry
    VS->>VS: Saga COMPENSATING speichern
    VS->>PS: releaseStock(saleId)
    PS-->>VS: RELEASED
    VS->>LS: releaseLimit(saleId)
    LS-->>VS: RELEASED
    VS->>VS: ACCOUNT_RECONCILIATION_PENDING speichern
    Note right of AS: Service ist nicht erreichbar
    VS->>AS: healthCheck bis Service wieder verfuegbar ist
    AS-->>VS: AVAILABLE
    VS->>AS: synchronizeCompensation(saleId)
    AS-->>VS: RELEASED oder REFUNDED
    Note right of AS: Status FUNDS_RELEASED oder FUNDS_REFUNDED speichern
    VS->>VS: Saga FAILED speichern und Lease freigeben
```

### Entscheidungen in Fehlerpfad 1b

- Produkt und Limit werden sofort freigegeben, weil beide Services erreichbar
  sind und ihre Reservierungen sicher bekannt sind.
- Für Account wird `ACCOUNT_RECONCILIATION_PENDING` gespeichert. So lange der
  Service down ist, bleibt die Kompensation bestehen und der ursprüngliche
  Abbuchungsaufruf wird nicht wiederholt.
- Nach Recovery führt `synchronizeCompensation(saleId)` zu `FUNDS_RELEASED`.
  Falls die Belastung vor dem Fehler schon erfolgt war, wird stattdessen
  `FUNDS_REFUNDED` gespeichert. Erst danach wird die Saga endgültig als
  `FAILED` abgeschlossen und die Lease freigegeben.

## Fehlerpfad 2a: Timeout bei der Produktreservierung

Ein Timeout bei `reserveStock` ist kein sicherer Fehler: Der Produkt Service
könnte den Bestand bereits reserviert haben, bevor die Antwort verloren ging.

### 2a.1 Retry der Produktreservierung ist erfolgreich

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]
    PS[Produkt Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren| AS
    VS -->|3. Produkt reservieren Timeout| PS
    VS -->|4. Produktreservierung mit gleicher saleId wiederholen| PS
    VS -->|5. Kauf fortsetzen| AS
```

```mermaid
sequenceDiagram
    autonumber
    participant VS as Verkaufsservice
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    VS->>LS: reserveLimit(saleId)
    LS-->>VS: RESERVED
    VS->>VS: Saga LIMIT_RESERVED speichern
    VS->>AS: reserveFunds(saleId)
    AS-->>VS: RESERVED
    VS->>VS: Saga FUNDS_RESERVED speichern

    VS->>PS: reserveStock(saleId)
    PS-->>VS: TIMEOUT
    VS->>VS: PRODUCT_RESERVATION_PENDING speichern
    Note right of PS: Produkt Ergebnis ist unbekannt
    VS->>PS: reserveStock(saleId) idempotent wiederholen
    PS-->>VS: RESERVED
    VS->>VS: Saga STOCK_RESERVED speichern
    VS->>AS: captureFunds(saleId)
    AS-->>VS: CONFIRMED
    VS->>LS: confirmLimit(saleId)
    LS-->>VS: CONFIRMED
    VS->>PS: commitStock(saleId)
    PS-->>VS: CONFIRMED
    VS->>VS: Saga COMPLETED speichern und Lease freigeben
```

#### Entscheidung in 2a.1

- Der Verkaufsservice speichert `PRODUCT_RESERVATION_PENDING`. Sobald Product
  Service nach dem Timeout wieder antwortet, wird exakt derselbe
  `reserveStock`-Aufruf mit derselben `saleId` wiederholt. Der Produkt Service
  liefert dann entweder die schon vorhandene Reservierung oder legt genau eine
  neue an.
- Weil der Retry `RESERVED` zurückgibt, wird der Kauf normal fortgesetzt. Die
  idempotente `saleId` stellt sicher, dass der Bestand höchstens einmal
  reserviert wird.

### 2a.2 Retry der Produktreservierung scheitert erneut

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]
    PS[Produkt Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren| AS
    VS -->|3. Produkt reservieren Timeout| PS
    VS -->|4. Produktreservierung erneut Fehler| PS
    VS -->|5. Guthaben freigeben| AS
    VS -->|6. Limit freigeben| LS
    VS -->|7. Produktkompensation erneut senden| PS
```

```mermaid
sequenceDiagram
    autonumber
    participant VS as Verkaufsservice
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    VS->>LS: reserveLimit(saleId)
    LS-->>VS: RESERVED
    VS->>AS: reserveFunds(saleId)
    AS-->>VS: RESERVED
    VS->>PS: reserveStock(saleId)
    PS-->>VS: TIMEOUT
    VS->>VS: PRODUCT_RESERVATION_PENDING speichern
    VS->>PS: reserveStock(saleId) idempotent wiederholen
    PS-->>VS: ERROR
    VS->>VS: Saga COMPENSATING speichern
    VS->>AS: releaseFunds(saleId)
    AS-->>VS: RELEASED
    VS->>LS: releaseLimit(saleId)
    LS-->>VS: RELEASED
    VS->>VS: PRODUCT_RECONCILIATION_PENDING speichern
    VS->>PS: releaseStock(saleId) idempotent wiederholen
    PS-->>VS: RELEASED oder NOT_RESERVED
    VS->>VS: Saga FAILED speichern und Lease freigeben
```

#### Entscheidung in 2a.2

- Guthaben und Limit werden sofort freigegeben, weil deren Reservierungen
  sicher bekannt sind.
- `PRODUCT_RECONCILIATION_PENDING` bleibt gespeichert, bis der Produkt Service
  die idempotente Freigabe bestätigt. `releaseStock(saleId)` löst dann eine
  möglicherweise durch einen der beiden Aufrufe entstandene Produktreservierung
  auf.
- Das entspricht dem Kompensationsmuster aus Fehlerpfad 1: Der fehlgeschlagene
  Kauf wird nicht fortgesetzt, aber jede unbekannte Teilwirkung wird später
  idempotent bereinigt.

## Fehlerpfad 2b: Timeout beim endgültigen Abbuchen des Bestands

Hier sind Limit und Guthaben bereits endgültig gebucht. Der Timeout bei
`commitStock` lässt offen, ob der Bestand schon abgebucht wurde.

### 2b.1 Retry des Bestandsabbuchens ist erfolgreich

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]
    PS[Produkt Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren| AS
    VS -->|3. Produkt reservieren| PS
    VS -->|4. Konto belasten| AS
    VS -->|5. Limit abbuchen| LS
    VS -->|6. Bestand abbuchen Timeout| PS
    VS -->|7. Bestand mit gleicher saleId erneut abbuchen| PS
```

```mermaid
sequenceDiagram
    autonumber
    participant VS as Verkaufsservice
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    VS->>LS: reserveLimit(saleId)
    LS-->>VS: RESERVED
    VS->>AS: reserveFunds(saleId)
    AS-->>VS: RESERVED
    VS->>PS: reserveStock(saleId)
    PS-->>VS: RESERVED
    VS->>AS: captureFunds(saleId)
    AS-->>VS: CONFIRMED
    VS->>LS: confirmLimit(saleId)
    LS-->>VS: CONFIRMED

    VS->>PS: commitStock(saleId)
    PS-->>VS: TIMEOUT
    VS->>VS: PRODUCT_COMMIT_RECONCILIATION_PENDING speichern
    Note right of PS: Produkt Ergebnis ist unbekannt
    VS->>PS: commitStock(saleId) idempotent wiederholen
    PS-->>VS: CONFIRMED
    VS->>VS: Saga COMPLETED speichern und Lease freigeben
```

#### Entscheidung in 2b.1

- Geld und Limit werden nicht sofort kompensiert, weil der erste
  `commitStock`-Aufruf trotz Timeout bereits erfolgreich gewesen sein kann.
- Derselbe idempotente `commitStock(saleId)`-Aufruf liefert beim Retry
  `CONFIRMED`, unabhängig davon, ob der erste oder der zweite Aufruf die
  Bestandsbuchung tatsächlich durchgeführt hat.

### 2b.2 Retry des Bestandsabbuchens scheitert erneut

```mermaid
flowchart LR
    VS[Verkaufsservice]
    LS[Limit Service]
    AS[Account Service]
    PS[Produkt Service]

    VS -->|1. Limit reservieren| LS
    VS -->|2. Guthaben reservieren| AS
    VS -->|3. Produkt reservieren| PS
    VS -->|4. Konto belasten| AS
    VS -->|5. Limit abbuchen| LS
    VS -->|6. Bestand abbuchen Timeout| PS
    VS -->|7. Bestand erneut Fehler| PS
    VS -->|8. Geld erstatten| AS
    VS -->|9. Limit zurueckrollen| LS
```

```mermaid
sequenceDiagram
    autonumber
    participant VS as Verkaufsservice
    participant LS as Limit Service
    participant AS as Account Service
    participant PS as Produkt Service

    VS->>LS: reserveLimit(saleId)
    LS-->>VS: RESERVED
    VS->>AS: reserveFunds(saleId)
    AS-->>VS: RESERVED
    VS->>PS: reserveStock(saleId)
    PS-->>VS: RESERVED
    VS->>AS: captureFunds(saleId)
    AS-->>VS: CONFIRMED
    VS->>LS: confirmLimit(saleId)
    LS-->>VS: CONFIRMED

    VS->>PS: commitStock(saleId)
    PS-->>VS: TIMEOUT
    VS->>VS: PRODUCT_COMMIT_RECONCILIATION_PENDING speichern
    VS->>PS: commitStock(saleId) idempotent wiederholen
    PS-->>VS: ERROR
    VS->>PS: getCommitStatus(saleId)
    PS-->>VS: NOT_RESERVED
    VS->>AS: refundFunds(saleId)
    AS-->>VS: REFUNDED
    VS->>LS: rollbackLimit(saleId)
    LS-->>VS: ROLLED_BACK
    VS->>VS: Saga FAILED speichern und Lease freigeben
```

#### Entscheidung in 2b.2

- Nach einem zweiten Fehler wird anhand der idempotenten `saleId` der
  Produktstatus abgefragt. Dieses Diagramm zeigt den Fall `NOT_RESERVED`.
- Weil kein Produkt verbindlich gebucht wurde, wird die bereits erfolgte
  Zahlung erstattet und das Tageslimit zurückgerollt.
- Ergibt die Statusabfrage stattdessen `CONFIRMED`, gilt dieselbe erfolgreiche
  Auflösung wie in 2b.1; es wird weder erstattet noch zurückgerollt.
