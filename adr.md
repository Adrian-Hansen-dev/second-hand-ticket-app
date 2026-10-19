# Architecture Decision Records (ADR)

Second Hand Ticket App – Microservice-Architektur (Assemblage).
Jeder ADR wird durch **Kontext, Entscheidung und Konsequenzen** charakterisiert (vgl. Cognitect, „Documenting Architecture Decisions"); zusätzlich führen wir **Alternativen**, **Treiber** und **Status**.

Architekturtreiber (Rangfolge): 1 Verfügbarkeit · 2 Usability · 3 Security · 4 Robustheit.
Status: `offen` · `akzeptiert` · `ersetzt durch ADR-xxx`.

> Die Endabgabe (2–3 A4-Seiten) übernimmt nur die 5–8 wichtigsten ADRs. Dieses Dokument ist die vollständige Arbeitsfassung.

## Übersicht

| ID | Thema | Status | Entscheidung fällt in |
| --- | --- | --- | --- |
| ADR-001 | Zahlungsabwicklung manuell, Bank nur externer Beteiligter | akzeptiert | Brief |
| ADR-002 | Aggregates sind keine Service-Grenzen | akzeptiert | Step 1 |
| ADR-003 | Mehrere Interessenten pro Ticket | offen | Step 3 (`expressPurchaseInterest`) |
| ADR-004 | Verhinderung des Doppelverkaufs | offen | Step 3 (`acceptOffer`) |
| ADR-005 | Storno: automatisch oder immer Admin | offen | Step 3 (`respondToCancellation`, `approveCancellation`) |
| ADR-006 | Voraussetzungen für erneutes Anbieten | offen | Step 3 (`requestTicketRelisting`) |
| ADR-007 | Guthaben: Reservierung oder sofortige Abbuchung | offen | Step 3 (`acceptOffer`, `confirmTicketReceival`) |
| ADR-008 | Abschluss einer manuellen Auszahlung ohne Doppelbelastung | offen | Step 3 (`requestWithdrawl`, `updateBalance`) |
| ADR-009 | Wer darf bewerten | akzeptiert | Step 3 (`rateUser`) |
| ADR-010 | Benachrichtigungen als eigene, ereignisgesteuerte Subdomäne | akzeptiert | Step 1/2 |
| ADR-011 | Brute-Force-Schutz im API Gateway | akzeptiert | Step 1 (`login`) |
| ADR-012 | Unzureichendes Guthaben bei Kaufabschluss | akzeptiert | Step 3 (`acceptOffer`) |
| ADR-013 | Ablauf der Ticketgültigkeit bei reserviertem Kauf | offen | Step 3 (`expireTicketOffer`) |
| ADR-014 | Berechtigungsprüfung über die Identität aus dem Login | akzeptiert | Step 2 |
| ADR-015 | Ticket Management in eigenem Ticket Service | akzeptiert | Step 3 (`createTicketOffer`) |
| ADR-016 | Ereignisreihenfolge zwischen Ticket Service und Conversation Service | offen | Step 3 (`expressPurchaseInterest`, `sendMessage`) |
| ADR-017 | Identität und Zuordnung von Chat-Nachrichten | offen | Step 3 (`sendMessage`) |
| ADR-018 | Auszahlungsanforderungen und manuelle Buchhaltung | ersetzt durch ADR-008 | Step 3 (`requestWithdrawl`, `updateBalance`) |
| ADR-019 | Zuverlässige Eventpublikation und Zustellung | offen | Step 3 (verteilte Operationen) |
| ADR-020 | Wirksamkeit von Benutzersperren | ersetzt durch ADR-033 | Step 3 (`blockUser`) |
| ADR-021 | Zuordnung der Benutzerbewertungen | ersetzt durch ADR-032 | Step 3 (`rateUser`) |
| ADR-022 | Serviceübergreifende Leseoperationen | ersetzt durch ADR-034 | Step 3 (Abfragen) |
| ADR-023 | Ticketsuche direkt im Ticket Service, ohne eigene Lesesicht | offen (Vorschlag) | Step 3 (`searchTicket`) |
| ADR-024 | Purchase Management im Ticket Service | akzeptiert | Step 3 (`expressPurchaseInterest`) |
| ADR-025 | Balance Management in eigenem Service, Geldfluss per Saga-Choreografie | akzeptiert | Step 3 (`acceptOffer`, `confirmTicketReceival`) |
| ADR-026 | Cancellation Management in eigenem Service | akzeptiert | Step 3 (`requestPurchaseCancellation`) |
| ADR-027 | Conversation Service, Chat entsteht per Event | akzeptiert | Step 3 (`expressPurchaseInterest`, `sendMessage`) |
| ADR-028 | IAM Service mit eigenem Auth Server | akzeptiert | Step 3 (`register`, `login`) |
| ADR-029 | Admin-Kommunikation per E-Mail in Iteration 1 | akzeptiert | Step 3 (`requestTicketReceivalStatus`) |
| ADR-030 | Auszahlung vorerst im Balance Service, später eigener Payment Service | akzeptiert | Step 3 (`requestWithdrawl`) |
| ADR-031 | Kollaboration zwischen Services nur asynchron (Korrekturen am Team-Diagramm) | akzeptiert | Step 3 (verteilte Operationen) |
| ADR-032 | Rating Service, Bewertungsberechtigung über Kaufereignisse | akzeptiert | Step 3 (`rateUser`) |
| ADR-033 | Sperre wirkt über `UserBlocked` im API Gateway | akzeptiert | Step 3 (`blockUser`) |
| ADR-034 | Zuordnung der restlichen Operationen und Abfragen (Rang 17–30) | akzeptiert | Step 3 (Rang 17–30) |

---

## ADR-001 – Zahlungsabwicklung manuell, Bank nur externer Beteiligter

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Quelle: Projektbrief, Abschnitt „Ein und Auszahlungen") |
| Kontext | Ein- und Auszahlungen erfolgen im ersten Schritt per Banküberweisung, die ein Mitarbeiter der Buchhaltung manuell durchführt. Weitere Zahlungsanbieter sind für die Zukunft geplant. |
| Entscheidung | Das System integriert keine Bank technisch. Die Buchhaltung bucht Ein- und Auszahlungen manuell über `updateBalance()`. Die Bank erscheint nur als externer Beteiligter. Ein Zahlungsanbieter wird später hinter einer eigenen Schnittstelle angebunden. |
| Alternativen | Direkte Bankanbindung von Anfang an: wäre automatisiert und schneller, ist aber laut Brief nicht gefordert und erhöht Aufwand und Sicherheitsrisiko. |
| Konsequenzen | (+) Geringe Komplexität im ersten Release. (−) Auszahlungen hängen von menschlicher Bearbeitung ab. (−) Die Schnittstelle zu künftigen Zahlungsanbietern muss früh sauber abgegrenzt sein. |
| Treiber | Security, Robustheit |

## ADR-002 – Aggregates sind keine Service-Grenzen

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Quelle: `systemoperationen.md`, Abschnitt „Domänenmodell") |
| Kontext | Die neun Aggregates sind fachliche Konsistenzgrenzen. Mehrere Operationen berühren mehrere Aggregates (z. B. `acceptOffer`: Purchase, TicketOffer, BalanceAccount). |
| Entscheidung | Aggregates werden zu Subdomänen gruppiert; Subdomänen werden in Step 3 zu Services gruppiert. Ein Aggregate ist nicht automatisch ein eigener Service. |
| Alternativen | Ein Service pro Aggregate: maximale Entkopplung und Teamautonomie, führt aber zu vielen verteilten Operationen, Sagas und höherer Laufzeitkopplung. |
| Konsequenzen | (+) Die Servicegrenzen werden anhand der Operationen und Kräfte begründet. (−) Jede Zuweisung braucht eine eigene Begründung (siehe weitere ADRs). |
| Treiber | Verfügbarkeit, Robustheit |

## ADR-003 – Mehrere Interessenten pro Ticket

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | `expressPurchaseInterest()` legt einen `Purchase` im Status `Pending` an und eröffnet einen Chat. Der Brief sagt nicht, ob mehrere Interessenten gleichzeitig mit demselben Verkäufer verhandeln dürfen. |
| Entscheidung | _offen_ |
| Alternativen | **A) Mehrere parallele Pending-Käufe**, das Ticket bleibt `Available`, bis beide Parteien zustimmen. Stärke: kein Blockieren durch unseriöse Interessenten, bessere Usability und Verkaufschance. Schwäche: mehr Zustände, Konflikte erst bei `acceptOffer`. **B) Exklusive Sperre**, das erste Interesse sperrt das Ticket (mit Timeout). Stärke: einfacher, kaum Konflikte. Schwäche: ein Interessent kann das Ticket blockieren. |
| Konsequenzen | _offen_ – hängt mit ADR-004 zusammen |
| Treiber | Usability, Verfügbarkeit |

## ADR-004 – Verhinderung des Doppelverkaufs

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | `acceptOffer()` ändert `Purchase`, `TicketOffer` und `BalanceAccount`. Parallele Kaufabschlüsse müssen sicher behandelt werden; keine Mehrfachabbuchung. Die Entscheidung hängt davon ab, in welchen Services diese Subdomänen landen. |
| Entscheidung | _offen_ – Vorschlag: durch ADR-024 gelöst (Ticket und Purchase im selben Service, Reservierung als lokale Transaktion) |
| Alternativen | **A) Reservierung des Tickets als erster, atomarer Schritt** einer Saga mit Kompensation. Stärke: lose Kopplung. Schwäche: Kompensationslogik. **B) Purchase, Ticket und Balance im selben Service** (ACID). Stärke: einfache Konsistenz. Schwäche: großer Service, geringere Teamautonomie. |
| Konsequenzen | _offen_ |
| Treiber | Robustheit, Security (Geldzustände) |

## ADR-005 – Storno: automatisch oder immer Admin

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | Brief: Antwortet der Verkäufer nicht innerhalb einer Frist, wird **für den Käufer entschieden**. Die Spezifikation legt dagegen jeden Stornoantrag dem Admin vor. Der Admin kommt im Brief nur beim Ausschluss von Verkäufern vor. |
| Entscheidung | _offen_ |
| Alternativen | **A) Automatisch**: Bestätigung oder Fristablauf führt zur Stornierung, der Admin entscheidet nur bei Widerspruch. Stärke: entspricht dem Brief, schnell, kein Admin-Engpass. Schwäche: Missbrauchsrisiko. **B) Immer Admin** (aktuelle Spezifikation). Stärke: Kontrolle. Schwäche: Engpass, langsamer, widerspricht dem Brief bei Fristablauf. |
| Konsequenzen | _offen_ – benötigt eine zeitgesteuerte Operation für den Fristablauf |
| Treiber | Usability, Security |

## ADR-006 – Voraussetzungen für erneutes Anbieten

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | Brief: Holt der Käufer das Ticket nicht ab, kann der Verkäufer es zum Verkauf zurücksetzen; das wird **sofort** umgesetzt und dem Käufer das Geld zurückgebucht. Unklar ist, ab wann das zulässig ist (z. B. nach bereits erfolgter Übergabe). |
| Entscheidung | _offen_ |
| Alternativen | **A) Sofort, ohne Bedingungen.** Stärke: entspricht dem Brief wörtlich. Schwäche: Betrugsrisiko nach erfolgter Übergabe. **B) Sofort, nur im Status `Accepted`** (nicht `Completed`), Käufer wird benachrichtigt. Stärke: sofort und sicherer. Schwäche: Fall „Käufer hat übernommen, bestätigt aber nicht" bleibt offen. **C) Mit Admin-Freigabe.** Stärke: sicher. Schwäche: widerspricht „sofort". |
| Konsequenzen | _offen_ – betrifft vier Subdomänen (Ticket, Purchase, Cancellation, Balance), vermutlich Saga |
| Treiber | Security, Usability |

## ADR-007 – Guthaben: Reservierung oder sofortige Abbuchung

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | Brief: Bei beidseitiger Zustimmung wird das Geld „abgebucht", bei Erhalt des Tickets an den Verkäufer „überwiesen". Die Spezifikation sagt „belastet oder reserviert"; das `BalanceAccount` kennt `ReservedBalance`. |
| Entscheidung | _offen_ |
| Alternativen | **A) Reservierung (Treuhand)**: Betrag bleibt beim Käufer reserviert, Übertrag erst bei `confirmTicketReceival()`. Stärke: einfache Rückbuchung, passt zum Modell. Schwäche: zwei Zustände pro Betrag. **B) Sofortige Abbuchung** auf ein Plattformkonto. Stärke: einfacher Saldo. Schwäche: Rückbuchung bei Storno ist eine echte Gegenbuchung. |
| Konsequenzen | _offen_ – bestimmt die Schritte der Sagas in `acceptOffer`, `confirmTicketReceival`, `approveCancellation`, `requestTicketRelisting` |
| Treiber | Security, Robustheit |

## ADR-008 – Abschluss einer manuellen Auszahlung ohne Doppelbelastung

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | `requestWithdrawl()` reserviert den Betrag. Die Buchhaltung schließt die Auszahlung derzeit über `updateBalance(userId, -amount)` ab. Löst diese Buchung die Reservierung nicht auf, wird derselbe Betrag doppelt abgezogen. |
| Entscheidung | _offen_ |
| Alternativen | **A) `updateBalance()` löst die Reservierung implizit auf** (aktuelle Spezifikation). Stärke: keine neue Operation. Schwäche: überladene Semantik, Fehlerrisiko. **B) Eigene Operation zum Abschluss einer Auszahlung** (bezogen auf `WithdrawalId`, idempotent), `updateBalance()` nur für Einzahlungen und Korrekturen. Stärke: klare Semantik, genau einmal. Schwäche: eine zusätzliche Systemoperation. |
| Konsequenzen | _offen_ |
| Treiber | Security, Robustheit |

## ADR-009 – Wer darf bewerten

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Brief: Benutzer bewerten sich gegenseitig „bei Verkaufsvorgängen". Die Spezifikation prüft die gemeinsame Beteiligung am Kauf, lässt aber offen, in welchem Status. |
| Entscheidung | Option A: Bewerten dürfen nur Käufer und Verkäufer eines abgeschlossenen Kaufs (`Completed`), je Beteiligtem eine Bewertung pro Kauf. Der Rating Service prüft das lokal über die Kopie berechtigter Käufe aus `TicketReceivalConfirmed` (ADR-032). |
| Alternativen | **A) Nur nach `Completed`**, eine Bewertung je Beteiligtem und Kauf. Stärke: fälschungssicher. Schwäche: Betrugsfälle (kein Ticket erhalten) bleiben unbewertet. **B) Auch nach `Cancelled`.** Stärke: Warnsignal für Käufer. Schwäche: Racheratings möglich. **C) Jeder Benutzer.** Stärke: einfach. Schwäche: Manipulation, widerspricht „bei Verkaufsvorgängen". |
| Konsequenzen | (+) Bewertungen sind an echte Käufe gebunden und schwer zu fälschen. (+) Passt zu „bei Verkaufsvorgängen" im Brief. (−) Betrugsfälle ohne Übergabe (Kauf storniert) bleiben unbewertet; Warnsignale für andere Käufer gibt es dann nur über Admin-Sperren (`blockUser()`). (−) Soll später auch nach einem Storno bewertet werden dürfen (Option B), muss der Rating Service zusätzlich `PurchaseReverted` abonnieren. |
| Treiber | Robustheit (gute Bewertung der Community), Security |

## ADR-010 – Benachrichtigungen als eigene, ereignisgesteuerte Subdomäne

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Viele Operationen „benachrichtigen" Käufer, Verkäufer oder Admin (`expressPurchaseInterest`, `requestPurchaseCancellation`, `approveCancellation`, `withdrawTicketOffer` u. a.). Benachrichtigungen gehörten bisher zu keinem Aggregate und keiner Subdomäne. Eine fehlgeschlagene Zustellung darf keinen Kauf oder Storno blockieren. |
| Entscheidung | Benachrichtigungen bilden eine eigene Subdomäne Notification mit dem Aggregate `Notification`. Operationen publizieren fachliche Events. Notification reagiert asynchron darauf, ermittelt Empfänger und Inhalt und stellt zu. Keine Operation ruft Notification synchron auf. Ergänzung (Team, 18.10.2026): Notification ist ein eigener Service, weil er nur eine austauschbare technische Schnittstelle zu den Geräte-Benachrichtigungen (E-Mail, Push) darstellen soll. |
| Alternativen | **A) Jede auslösende Subdomäne benachrichtigt selbst.** Gewinnt bei einfachen Interaktionen: keine zusätzlichen Events und kein zusätzlicher Service, Inhalt und Anlass liegen beieinander. Nicht gewählt, weil Zustelllogik und Kanäle in jeder Subdomäne dupliziert würden und ein Zustellproblem den fachlichen Ablauf verzögern könnte. **B) Synchroner Aufruf einer zentralen Notification-Komponente.** Gewinnt bei Nachvollziehbarkeit, da der Aufrufer den Zustellerfolg sofort kennt. Nicht gewählt, weil das Laufzeitkopplung auf kritischen Pfaden erzeugt (Verfügbarkeit). |
| Konsequenzen | (+) Benachrichtigung liegt nicht auf dem kritischen Pfad; ein Ausfall von Notification blockiert keinen Kauf (Verfügbarkeit). (+) Kanäle (E-Mail, Push, später weitere) werden an einer Stelle erweitert. (−) Ein zusätzlicher Service und zusätzliche Events. (−) Zustellung ist nur eventual consistent; Nutzer erfahren Änderungen leicht verzögert. (−) Notification hängt beim Design vom Event-Schema der anderen Subdomänen ab. (−) Notification braucht die Kontaktdaten der Benutzer; sie kommen als Kopie über das Event `UserRegistered` (ADR-031). |
| Treiber | Verfügbarkeit, Usability |

## ADR-011 – Brute-Force-Schutz im API Gateway

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | `login()` verlangt Schutz vor Brute-Force-Angriffen. Dafür müssen Fehlversuche gezählt werden, also Zustand. Die Spezifikation sagt gleichzeitig, `login()` schreibe keine fachlichen Aggregates. |
| Entscheidung | Fehlversuche werden im API Gateway gezählt und gedrosselt (z. B. pro Benutzername und Herkunft). Das ist ein Infrastrukturbelang; `login()` bleibt eine reine Leseoperation auf `User`. |
| Alternativen | **A) Zähler für Fehlversuche im `User`-Aggregate.** Gewinnt bei fachlicher Nachvollziehbarkeit: dauerhafte Sperre nach n Versuchen, im Benutzerkonto sichtbar und für den Admin auswertbar. Nicht gewählt, weil jeder Login-Versuch dann `User` schreibt und Angriffe Last auf die Benutzerdaten erzeugen. **B) Eigenes Aggregate `LoginAttempt`.** Gewinnt bei sauberer Trennung im Fachmodell. Nicht gewählt, weil es eine fachfremde Subdomäne nur für ein technisches Anliegen einführt. |
| Konsequenzen | (+) `login()` schreibt nichts, Angriffe treffen nicht die Benutzerdaten. (+) Der Schutz greift für alle Endpunkte einheitlich. (−) Das API Gateway hält Zustand und muss bei mehreren Instanzen einen gemeinsamen Zähler nutzen. (−) Eine dauerhafte, fachliche Kontosperre nach Angriffen ist nicht abgedeckt (dafür bleibt `blockUser()`). |
| Treiber | Security, Verfügbarkeit |

## ADR-012 – Unzureichendes Guthaben bei Kaufabschluss

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | `acceptOffer()` reserviert nach beidseitiger Zustimmung den `AgreedPrice` beim Käufer. Die Spezifikation regelt nicht, was passiert, wenn das verfügbare Guthaben nicht reicht. Einzahlungen werden manuell gebucht (ADR-001) und können Tage dauern. |
| Entscheidung | Option C: Die Zustimmungen beider Parteien werden gespeichert, das Ticket wird reserviert. Erst danach prüft und reserviert der Balance Service den Betrag (ADR-025, ADR-031). Reicht das Guthaben nicht, publiziert er `AmountReservationFailed`; der Ticket Service kompensiert: Ticket wieder `Available`, Kauf zurück auf `Pending`. Käufer und Verkäufer werden benachrichtigt. |
| Alternativen | **A) Käuferzustimmung wird abgelehnt**, solange das Guthaben nicht reicht. Gewinnt bei Einfachheit und Konsistenz: kein Zwischenzustand, keine Kompensation. Schwäche: Käufer muss erst einzahlen, dann erneut zustimmen. **B) Zustimmung bleibt gespeichert, Reservierung folgt nach Einzahlung** (mit Frist). Gewinnt bei Usability: Käufer kann sofort zusagen. Schwäche: zusätzlicher Zustand, Ticket bleibt blockiert, zeitgesteuerte Operation nötig. **C) Prüfung erst nach Zustimmung beider, bei Fehlschlag Kompensation** (Saga-Schritt schlägt fehl, Purchase zurück auf `Pending`). Gewinnt bei loser Kopplung zwischen Purchase und Balance. Schwäche: Verkäufer hat bereits zugestimmt und wird enttäuscht. |
| Konsequenzen | (+) Keine synchrone Prüfung beim Balance Service, keine Laufzeitkopplung (Verfügbarkeit). (+) Der Fehlerpfad ist eindeutig und kompensierbar. (−) Der Verkäufer hat bereits zugestimmt und wird enttäuscht. (−) Das Ticket ist kurzzeitig reserviert, obwohl der Kauf scheitert. (−) Der Käufer muss einzahlen und erneut zustimmen. |
| Treiber | Usability, Robustheit |

## ADR-013 – Ablauf der Ticketgültigkeit bei reserviertem Kauf

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | `expireTicketOffer()` setzt verfügbare Tickets nach `ValidUntil` auf `Expired`. Ist der Kauf bereits `Accepted` (Geld reserviert) und der Käufer hat den Erhalt nicht bestätigt, ist unklar, ob das Ticket übergeben wurde. |
| Entscheidung | _offen_ |
| Alternativen | **A) Automatische Rückbuchung an den Käufer.** Gewinnt bei Käuferschutz und Einfachheit. Schwäche: Verkäufer verliert Geld, wenn der Käufer das Ticket erhalten, aber nicht bestätigt hat. **B) Automatische Freigabe an den Verkäufer** nach einer Karenzfrist. Gewinnt beim Verkäuferschutz, kein Geld bleibt hängen. Schwäche: Käufer ohne Ticket verliert Geld. **C) Fall wird dem Admin vorgelegt** (nutzt `requestTicketReceivalStatus()`). Gewinnt bei Fairness. Schwäche: Admin-Engpass, langsam. |
| Konsequenzen | _offen_ – betrifft Ticket, Purchase und Balance, vermutlich Saga |
| Treiber | Robustheit, Security |

## ADR-014 – Berechtigungsprüfung über die Identität aus dem Login

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Viele Operationen „lesen" `User` nur, um Identität oder Rolle des Aufrufers zu prüfen (`createTicketOffer`, `sendMessage`, `requestWithdrawl`, `updateBalance` u. a.). Zählt dieser Lesezugriff als Subdomäne, wird fast jede Operation subdomänenübergreifend und hängt zur Laufzeit von IAM ab. |
| Entscheidung | `login()` stellt eine Identität aus (UserId, Rolle, Status). Das API Gateway prüft sie bei jeder Anfrage und reicht sie an die Services weiter. Berechtigungsprüfungen nutzen diese Identität und lesen das `User`-Aggregate nicht. Wo fachliche Benutzerdaten gebraucht werden (z. B. IBAN, Kundennummer), bleibt der Lesezugriff bestehen. |
| Alternativen | **A) `User` bei jeder Prüfung synchron lesen.** Gewinnt bei Aktualität: eine Sperre oder Rollenänderung wirkt sofort. Nicht gewählt, weil IAM damit auf jedem kritischen Pfad liegt und ein IAM-Ausfall die ganze Plattform blockiert (Verfügbarkeit). **B) Lokale Kopie der Benutzerdaten in jedem Service, aktualisiert per Event.** Gewinnt bei Aktualität ohne Laufzeitkopplung. Nicht gewählt, weil jeder Service zusätzliche Replik und Event-Handler bräuchte. |
| Konsequenzen | (+) Sechs Operationen bleiben lokal, darunter `createTicketOffer()` und `sendMessage()`. (+) IAM liegt nur bei `login()` und `register()` auf dem kritischen Pfad. (−) Eine Sperre durch `blockUser()` wirkt erst, wenn die ausgestellte Identität abläuft oder widerrufen wird; das wird bei `blockUser()` gelöst. (−) Rollenänderungen greifen erst nach erneutem Login. (+) Rollenprüfungen laufen ebenfalls über die Login-Identität: `approveCancellation()`, `blockUser()`, `requestTicketReceivalStatus()` und `viewOpenCancellations()` nur für Admin; `updateBalance()`, `viewPendingWithdrawals()` und `findUserByCustomerNumber()` nur für Accounting (Team, 18.10.2026). |
| Treiber | Verfügbarkeit, Security |

## ADR-015 – Ticket Management in eigenem Ticket Service

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Erste Iteration von Schritt 3 (`createTicketOffer()`, Rang 1); die Architektur ist leer. Die Operation schreibt nur `TicketOffer` (Ticket Management); IAM wird laut ADR-014 nur über die Identität aus dem Login genutzt. Offen ist, ob der Benutzerstatus (gesperrt) zusätzlich geprüft wird. |
| Entscheidung | Ticket Management wird einem neuen **Ticket Service** zugewiesen. `createTicketOffer()` ist lokal; das API Gateway prüft die Identität und leitet weiter. |
| Alternativen | **A) Benutzerstatus synchron bei IAM prüfen.** Gewinnt bei Security: eine Sperre wirkt sofort. Nicht gewählt, weil ein IAM-Ausfall das Anlegen von Angeboten blockiert (Verfügbarkeit, Rang 1) und ADR-014 widerspricht. **B) Lokale Kopie gesperrter Benutzer im Ticket Service, aktualisiert über ein Event `UserBlocked`.** Gewinnt bei Security ohne Laufzeitkopplung. Vorerst nicht gewählt, weil die Sperre alle Services betrifft und einheitlich bei `blockUser()` entschieden werden soll. |
| Konsequenzen | (+) Einfachster Service, keine Laufzeitkopplung, die hohe Leselast der Suche ist von IAM getrennt. (+) Team Marktplatz kann unabhängig liefern (Teamzuschnitt siehe Schritt 2). (−) Ein gesperrter Benutzer kann bis zum Ablauf seiner Anmeldung noch Angebote anlegen. (−) Ob Purchase Management später in denselben Service kommt, ist offen (Entscheidung bei `expressPurchaseInterest()`). (+) `createTicketOffer()` speichert die UserId des Verkäufers (`SellerId`) aus der Login-Identität am `TicketOffer` (Team, 18.10.2026). |
| Treiber | Verfügbarkeit, Usability |

## ADR-016 – Ereignisreihenfolge zwischen Ticket Service und Conversation Service

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | Der Ticket Service veröffentlicht Events, die vom Conversation Service verarbeitet werden. Da die Kommunikation asynchron erfolgt, kann nicht garantiert werden, dass Events in der richtigen Reihenfolge eintreffen. Dadurch könnten Nachrichten oder Statusänderungen falsch verarbeitet werden. |
| Entscheidung | Noch offen. Empfohlen wird, Events pro PurchaseId geordnet zu verarbeiten und Zustandsübergänge im Conversation Service zu validieren. |
| Alternativen | **A) Geordnete Eventverarbeitung pro PurchaseId.** Gewinnt bei Konsistenz und nachvollziehbaren Abläufen. Nachteil: zusätzliche technische Komplexität. **B) Ungeordnete Verarbeitung mit Versionsprüfung.** Gewinnt bei Skalierbarkeit und geringerer Kopplung. Nachteil: veraltete Events müssen erkannt und behandelt werden. **C) Synchrone Kommunikation.** Gewinnt bei unmittelbarer Rückmeldung. Nicht bevorzugt, da Ausfälle des Conversation Service den Ticket Service blockieren könnten. |
| Konsequenzen | (+) Konsistente Verarbeitung zusammengehöriger Events. (+) Weniger fehlerhafte Zustandsübergänge. (−) Zusätzlicher Aufwand für Eventverarbeitung, Wiederholungen und Fehlerbehandlung. |
| Treiber | Robustheit, Verfügbarkeit |

## ADR-017 – Identität und Zuordnung von Chat-Nachrichten

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | Jede Conversation gehört zu einem Purchase. Beim Senden einer Nachricht muss sichergestellt werden, dass der Benutzer tatsächlich am Kauf beteiligt ist. Eine frei übergebene UserId darf nicht als vertrauenswürdige Absenderidentität verwendet werden. |
| Entscheidung | Noch offen. Empfohlen wird, die Absenderidentität aus dem authentifizierten Kontext zu übernehmen. Jede Conversation wird eindeutig einer PurchaseId zugeordnet. |
| Alternativen | **A) Absenderidentität aus dem Authentifizierungskontext.** Gewinnt bei Security und verhindert die Manipulation der Absenderidentität. **B) UserId als Request-Parameter.** Gewinnt bei einfacher Implementierung, ermöglicht jedoch Identitätsmanipulation ohne zusätzliche Prüfung. **C) Synchrone Berechtigungsprüfung beim Ticket Service für jede Nachricht.** Gewinnt bei aktuellen Berechtigungen, erhöht jedoch die Laufzeitkopplung und reduziert die Verfügbarkeit. |
| Konsequenzen | (+) Nachrichten können nicht unter einer beliebigen Benutzeridentität gesendet werden. (+) Eindeutige Zuordnung zwischen Purchase und Conversation. (−) Der Conversation Service benötigt verlässliche Informationen über die beteiligten Benutzer. |
| Treiber | Security, Verfügbarkeit, Robustheit |

## ADR-018 – Auszahlungsanforderungen und manuelle Buchhaltung

| Feld | Inhalt |
| --- | --- |
| Status | ersetzt durch ADR-008 (gleiche Frage, dort weitergeführt) |
| Kontext | Auszahlungen erfolgen in der ersten Iteration manuell durch die Buchhaltung. `requestWithdrawl()` fordert eine Auszahlung an und reserviert den entsprechenden Betrag. `updateBalance()` wird anschließend zur manuellen Verbuchung verwendet. Dabei besteht das Risiko, dass Guthaben doppelt belastet oder eine Auszahlung mehrfach durchgeführt wird. |
| Entscheidung | Noch offen. Empfohlen wird, Auszahlungsanforderungen mit einer eindeutigen WithdrawalId und einem eigenen Status zu verwalten. Die abschließende Verbuchung soll idempotent erfolgen und die Reservierung auflösen. |
| Alternativen | **A) Eigener Auszahlungsabschluss mit WithdrawalId.** Gewinnt bei Security, Nachvollziehbarkeit und Vermeidung doppelter Buchungen. Nachteil: zusätzliche Operation und Zustandsverwaltung. **B) Abschluss über `updateBalance()`.** Gewinnt bei geringerem Implementierungsaufwand. Nachteil: unterschiedliche Buchungsvorgänge werden vermischt und die Gefahr von Doppelbelastungen steigt. **C) Automatische Bankintegration.** Gewinnt bei Geschwindigkeit und Automatisierung. Nicht gewählt, da die erste Iteration laut Projektbrief manuelle Banküberweisungen vorsieht. |
| Konsequenzen | (+) Auszahlungen sind nachvollziehbar und eindeutig identifizierbar. (+) Doppelte Guthabenbelastungen können verhindert werden. (−) Zusätzliche Zustände und Validierungsregeln werden benötigt. |
| Treiber | Security, Robustheit |

## ADR-019 – Zuverlässige Eventpublikation und Zustellung

| Feld | Inhalt |
| --- | --- |
| Status | offen |
| Kontext | Mehrere Services kommunizieren über asynchrone Events. Beispielsweise informieren Ticket Service, Balance Service und Cancellation Service andere Services über fachliche Zustandsänderungen. Schlägt die Eventpublikation nach einer erfolgreichen Datenbankänderung fehl, können andere Services einen veralteten Zustand behalten. Außerdem können Events mehrfach zugestellt werden. |
| Entscheidung | Noch offen. Empfohlen wird das Transactional-Outbox-Pattern für die zuverlässige Eventpublikation sowie eine idempotente Eventverarbeitung durch die empfangenden Services. |
| Alternativen | **A) Transactional Outbox mit idempotenten Consumern.** Gewinnt bei Robustheit, da Datenänderung und Speicherung des Events atomar erfolgen. Nachteil: zusätzliche Infrastruktur und Verarbeitung. **B) Direkte Eventpublikation nach dem Datenbank-Commit.** Gewinnt bei Einfachheit. Nachteil: Events können bei einem Ausfall verloren gehen. **C) Synchrone Serviceaufrufe.** Gewinnt bei unmittelbarer Fehlererkennung. Nicht bevorzugt, da dadurch Laufzeitkopplung entsteht und die Verfügbarkeit sinkt. |
| Konsequenzen | (+) Fachliche Events gehen bei temporären Ausfällen nicht verloren, sofern die Outbox zuverlässig verarbeitet wird. (+) Doppelte Zustellungen verursachen bei korrekter Idempotenz keine mehrfachen fachlichen Änderungen. (−) Zusätzlicher Aufwand für Outbox-Verarbeitung, Retry-Mechanismen und Monitoring. (−) Eventual Consistency bleibt bestehen. |
| Treiber | Robustheit, Verfügbarkeit, Security |

## ADR-020 – Wirksamkeit von Benutzersperren

| Feld | Inhalt |
| --- | --- |
| Status | ersetzt durch ADR-033 |
| Kontext | `blockUser()` sperrt einen Benutzer im IAM Service. Laut ADR-014 verwenden andere Services die beim Login ausgestellte Identität, ohne den Benutzerstatus bei jeder Anfrage synchron zu prüfen. Dadurch könnten gesperrte Benutzer mit einem bereits gültigen Token weiterhin Aktionen durchführen. |
| Entscheidung | Noch offen. Empfohlen werden kurzlebige Access Tokens und ein zentraler Widerrufsmechanismus für sicherheitskritische Sperrungen. |
| Alternativen | **A) Kurzlebige Tokens mit Widerrufsmechanismus.** Gewinnt bei Security und begrenzter Laufzeitkopplung. Nachteil: zusätzlicher Verwaltungsaufwand. **B) IAM bei jeder Anfrage synchron prüfen.** Gewinnt bei sofortiger Durchsetzung von Sperren. Nicht bevorzugt, weil IAM-Ausfälle andere Services blockieren. **C) Sperrstatus über Events verteilen.** Gewinnt bei Verfügbarkeit. Nachteil: verzögerte und möglicherweise inkonsistente Sperrwirkung. |
| Konsequenzen | (+) Sperrungen können auch bei bestehenden Sitzungen wirksam werden. (+) Sicherheitsrisiken durch weiterhin gültige Tokens werden reduziert. (−) Zusätzliche Infrastruktur für Token-Widerruf oder Sperrlisten. |
| Treiber | Security, Verfügbarkeit |

## ADR-021 – Zuordnung der Benutzerbewertungen

| Feld | Inhalt |
| --- | --- |
| Status | ersetzt durch ADR-032 |
| Kontext | `rateUser()` benötigt Informationen über einen Kaufvorgang und speichert eine Bewertung im Aggregate Rating. `viewUserRatings()` liest ausschließlich Bewertungen. Offen ist, ob dafür ein eigener Service notwendig ist oder User Rating einem bestehenden Service zugeordnet wird. |
| Entscheidung | Noch offen. Empfohlen wird, User Rating dem bestehenden User Service zuzuordnen, sofern dieser Benutzerprofile verwaltet. Die Berechtigung zur Bewertung wird anhand des zugehörigen Purchase geprüft. |
| Alternativen | **A) User Rating im User Service.** Gewinnt bei einfachen Komponenten und geringem Betriebsaufwand. Nachteil: Abhängigkeit zur Kaufverwaltung bei Berechtigungsprüfungen. **B) Eigener Rating Service.** Gewinnt bei unabhängiger Skalierung und Teamautonomie. Nicht bevorzugt, weil zusätzliche Servicekommunikation und Infrastruktur entstehen. **C) User Rating im Ticket Service.** Gewinnt bei lokaler Prüfung der Kaufberechtigung. Nachteil: Bewertungen werden mit der Ticket- und Kauflogik gekoppelt. |
| Konsequenzen | (+) Kein zusätzlicher Microservice notwendig. (+) Bewertungen können unabhängig vom Kaufabschluss gelesen werden. (−) Die Berechtigung zur Bewertung benötigt Informationen über abgeschlossene Kaufvorgänge. |
| Treiber | Usability, Verfügbarkeit, Robustheit |

## ADR-022 – Serviceübergreifende Leseoperationen

| Feld | Inhalt |
| --- | --- |
| Status | ersetzt durch ADR-034 |
| Kontext | Einige Leseoperationen benötigen Informationen aus mehreren Subdomänen, beispielsweise `viewOpenCancellations()` mit Cancellation und Purchase sowie `viewPendingWithdrawals()` mit Withdrawal und User. Eine direkte gemeinsame Datenbankabfrage über Servicegrenzen würde die Unabhängigkeit der Services verletzen. |
| Entscheidung | Noch offen. Empfohlen wird, lokale Abfragen direkt beim datenverantwortlichen Service auszuführen und serviceübergreifende Informationen bei Bedarf über API Composition zusammenzuführen. |
| Alternativen | **A) API Composition.** Gewinnt bei einfacher Umsetzung ohne redundante Datenhaltung. Nachteil: zusätzliche Laufzeitabhängigkeiten. **B) CQRS mit lokalen Read Models.** Gewinnt bei Verfügbarkeit und schnellen Abfragen. Nachteil: zusätzliche Eventverarbeitung und Eventual Consistency. **C) Gemeinsame Datenbankabfragen.** Gewinnt bei einfacher Datenzusammenführung. Nicht bevorzugt, weil dadurch Datenhoheit und unabhängige Weiterentwicklung der Services beeinträchtigt werden. |
| Konsequenzen | (+) Klare Datenverantwortung der Services. (+) Keine direkte Kopplung zwischen den Datenbanken. (−) Zusammengesetzte Abfragen können bei Ausfällen einzelner Services eingeschränkt sein. |
| Treiber | Verfügbarkeit, Usability, Robustheit |

## ADR-023 – Ticketsuche direkt im Ticket Service, ohne eigene Lesesicht

| Feld | Inhalt |
| --- | --- |
| Status | offen (Vorschlag: Kandidat #1, wartet auf Freigabe) |
| Kontext | `searchTicket()` (Rang 2) ist die meistgenutzte Operation und liest nur `TicketOffer`, das seit ADR-015 im Ticket Service liegt. Keine Subdomäne ist frei. Offen ist, ob die Suche aus dem Ticket Service heraus oder über eine eigene Lesesicht (CQRS) beantwortet wird. |
| Entscheidung | Vorschlag: Der Ticket Service beantwortet `searchTicket()` direkt aus seinen `TicketOffer`-Daten; das API Gateway leitet weiter. |
| Alternativen | **A) Eigener Search Service mit Lesesicht (CQRS)**, aktualisiert über Events des Ticket Service. Gewinnt bei Verfügbarkeit (Suche bleibt bei Ausfall des Ticket Service erreichbar), bei unabhängiger Skalierung der Leselast und bei freier Wahl einer suchoptimierten Datenhaltung. Nicht gewählt, weil ohne Ticket Service ohnehin kein Kauf beginnen kann, der Ticket Service auch als Ganzes mehrfach betrieben werden kann, und #2 einen zusätzlichen Service, Events und kurzzeitig veraltete Treffer kostet. |
| Konsequenzen | (+) Kein zusätzlicher Service, keine Events; Treffer sind immer aktuell. (−) Such-Leselast und Schreibzugriffe skalieren gemeinsam. (−) Fällt der Ticket Service aus, ist auch die Suche nicht verfügbar. Beides wird in Schritt 4 als möglicher Smell geprüft; CQRS bleibt dort die Option. |
| Treiber | Verfügbarkeit, Usability |

## ADR-024 – Purchase Management im Ticket Service

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Architektur vom 18.10.2026) |
| Kontext | `expressPurchaseInterest()` (Rang 3) braucht Ticket Management (bereits Ticket Service) und Purchase Management (frei). `acceptOffer()` muss ein Ticket reservieren, ohne es doppelt zu verkaufen. |
| Entscheidung | Purchase Management kommt in den Ticket Service. Verfügbarkeitsprüfung, Anlage des Kaufs und Reservierung des Tickets laufen jeweils in einer lokalen Transaktion. |
| Alternativen | **A) Eigener Purchase Service.** Gewinnt bei kleinen, fokussierten Services und unabhängiger Skalierung. Nicht gewählt, weil die Verfügbarkeitsprüfung dann ein synchroner Aufruf und der Schutz vor Doppelverkauf eine Saga wäre. **B) Purchase und Conversation in einem Service.** Gewinnt, weil Kauf und Chat atomar entstehen. Nicht gewählt, weil zwei Teams in einem Service landen und die Chat-Last neben der Kauflogik liegt. |
| Konsequenzen | (+) Doppelverkauf ist durch eine lokale Transaktion ausgeschlossen (löst ADR-004). (+) Ticket und Kauf gehören einem Team (Marktplatz). (−) Der Ticket Service wird groß; Such-Leselast und Kaufabwicklung liegen zusammen (siehe ADR-023) – Kandidat für einen Smell in Schritt 4. |
| Treiber | Robustheit, Verfügbarkeit |

## ADR-025 – Balance Management in eigenem Service, Geldfluss per Saga-Choreografie

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Architektur vom 18.10.2026) |
| Kontext | `acceptOffer()`, `confirmTicketReceival()` und Rückbuchungen ändern das Guthaben. Geld hat die höchsten Security- und Konsistenzanforderungen und wird von Accounting bearbeitet. |
| Entscheidung | Balance Management (`BalanceAccount`, `Withdrawal`) kommt in einen eigenen **Balance Service**. Der Ticket Service publiziert `OfferWasAccepted`, `TicketReceivalConfirmed` und `PurchaseReverted`; der Balance Service reagiert darauf: Betrag reservieren, an den Verkäufer freigeben, an den Käufer zurückbuchen (Choreografie). |
| Alternativen | **A) Balance im Ticket Service.** Gewinnt, weil alles in einer ACID-Transaktion läuft und keine Saga nötig ist. Nicht gewählt, weil Gelddaten neben der öffentlichen Suche lägen und zwei Teams einen Service teilen (Security). **B) Orchestrierung durch den Ticket Service** mit generischen Commands (`ReserveAmount`, `ReleaseAmount`) und Antworten. Gewinnt, weil der Balance Service keine Kauf-Events verstehen muss und seine Operationen für Storno und Auszahlung wiederverwendet. Nicht gewählt, weil das Team durchgängig Events bevorzugt und Command- und Reply-Kanäle zusätzlichen Aufwand bedeuten. |
| Konsequenzen | (+) Geld ist isoliert und gehört Team Zahlungen. (+) Asynchron: ein Ausfall des Balance Service verzögert den Kauf nur. (−) Der Balance Service hängt vom Event-Schema des Ticket Service ab. (−) Im Team-Diagramm fehlt ein Rückkanal: Scheitert die Reservierung (zu wenig Guthaben), erfährt der Ticket Service davon nichts (siehe ADR-012, ADR-031). (−) Geldzustände sind eventual consistent; jeder Handler muss je `PurchaseId` idempotent sein. |
| Treiber | Security, Verfügbarkeit |

## ADR-026 – Cancellation Management in eigenem Service

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Architektur vom 18.10.2026) |
| Kontext | `requestPurchaseCancellation()` (Rang 12) ist die erste Operation mit Cancellation Management. Die späteren Storno-Operationen schreiben Cancellation, Purchase, Ticket und Balance. |
| Entscheidung | Cancellation Management (`Cancellation`, `RelistingRequest`) kommt in einen eigenen **Cancellation Service** mit allen Storno-Operationen inklusive `requestTicketRelisting()` und der Fristüberwachung (`expireCancellationDeadline()`). |
| Alternativen | **A) Cancellation im Ticket Service.** Gewinnt, weil Storno und Kauf atomar bleiben (kein Wettlauf mit `confirmTicketReceival()`) und die späteren Storno-Operationen nur noch eine Saga mit dem Balance Service bräuchten. Nicht gewählt, weil der Ticket Service dann drei Subdomänen hielte und Team Interaktion die Zuständigkeit verlöre. |
| Konsequenzen | (+) Kleiner, fokussierter Service für Team Interaktion. (−) Storno-Operationen sind über drei Services verteilt (Cancellation, Ticket, Balance). (−) Der Cancellation Service braucht Kaufdaten (Käufer, Verkäufer, Status) für Berechtigungsprüfungen (siehe ADR-031). (−) Den Wettlauf zwischen Storno und Erhaltsbestätigung muss der Ticket Service als letzte Instanz auflösen. |
| Treiber | Usability, Robustheit |

## ADR-027 – Conversation Service, Chat entsteht per Event

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Architektur vom 18.10.2026) |
| Kontext | Käufer und Verkäufer verhandeln Preis und Übergabe im Chat. Der Chat entsteht mit dem Kaufinteresse (`expressPurchaseInterest()`), Nachrichten werden über `sendMessage()` verschickt. |
| Entscheidung | Communication Management kommt in einen eigenen **Conversation Service**. Er legt den Chat an, sobald er das Event `PurchaseInterestExpressed` erhält. Team-Annahmen: Die Events des Ticket Service werden in der richtigen Reihenfolge verarbeitet. `sendMessage()` hat immer eine chatID mit Bezug auf das Ticket. Ohne Ticket gibt es keinen Chat; danach können keine Nachrichten mehr verschickt werden. |
| Alternativen | **A) Conversation im Ticket Service.** Gewinnt, weil der Chat sofort mit dem Kaufinteresse bereitsteht. Nicht gewählt, weil die hohe Chat-Schreiblast neben der Kauflogik läge und Team Interaktion den Chat verantwortet. **B) Synchrone Anlage des Chats durch den Ticket Service.** Gewinnt bei sofortiger Verfügbarkeit des Chats. Nicht gewählt wegen Laufzeitkopplung (Verfügbarkeit). |
| Konsequenzen | (+) Ein Ausfall des Chats blockiert keinen Kauf. (−) Der Chat steht kurz nach dem Kaufinteresse bereit. (−) Reihenfolge ist realistisch nur je Kauf garantierbar (Schlüssel `PurchaseId`), nicht global; Handler müssen idempotent sein. (−) ⚠ Bei mehreren Interessenten pro Ticket (ADR-003, Option A) gibt es mehrere Chats pro Ticket; die chatID sollte daher auf den Kauf (`PurchaseId`) verweisen. Über Servicegrenzen gibt es keinen Fremdschlüssel, nur eine Referenz-ID. (−) „Ohne Ticket kein Chat" verlangt Events an den Conversation Service, wenn ein Angebot zurückgezogen wird oder abläuft (siehe ADR-031). |
| Treiber | Usability, Verfügbarkeit |

## ADR-028 – IAM Service mit eigenem Auth Server

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Architektur vom 18.10.2026) |
| Kontext | `register()`, `login()` und `blockUser()` verwalten Benutzerkonten. Laut ADR-014 stellt `login()` die Identität aus, die das API Gateway prüft. Bei der Registrierung muss ein Guthabenkonto entstehen. |
| Entscheidung | Identity & Access Management kommt in einen eigenen **IAM Service**. Er enthält einen separaten Auth Server, der die Login-Identität ausstellt. Nach `register()` eröffnet der Balance Service das Guthabenkonto des neuen Benutzers. |
| Alternativen | **A) Externer Identity-Anbieter statt eigenem Auth Server.** Gewinnt, weil IAM eine generische Subdomäne ist und kein Eigenbau nötig wäre. Für Iteration 1 nicht gewählt; durch die Kapselung im IAM Service später möglich. |
| Konsequenzen | (+) Sicherheitskritische Daten (Passwörter, persönliche Daten) sind isoliert. (+) Der Auth Server ist austauschbar. (−) IAM liegt bei `login()` und `register()` auf dem kritischen Pfad. (−) Das Team-Diagramm zeigt `createsAccount` als direkten Pfeil zum Balance Service; laut ADR-031 wird daraus das Event `UserRegistered`. |
| Treiber | Security, Verfügbarkeit |

## ADR-029 – Admin-Kommunikation per E-Mail in Iteration 1

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Annahme vom 18.10.2026); ersetzt die frühere Teamentscheidung „Admin-Nachfrage in die `Conversation`" in `systemoperationen.md` |
| Kontext | Der Admin muss bei Streitfällen beim Verkäufer nachfragen (`requestTicketReceivalStatus()`) und mit Benutzern kommunizieren. |
| Entscheidung | In der ersten Iteration spricht der Admin mit Benutzern per E-Mail. Die E-Mail wird über den Notification Service versendet; der Admin ist kein Chat-Teilnehmer. |
| Alternativen | **A) Nachricht in die `Conversation` des Kaufs** (frühere Teamentscheidung). Gewinnt, weil der ganze Verlauf an einem Ort im System nachvollziehbar ist. Nicht gewählt, weil der Admin dafür Chat-Teilnehmer werden müsste – mehr Aufwand in Iteration 1. |
| Konsequenzen | (+) Einfach, nutzt den vorhandenen Notification Service. (−) Die Antwort des Verkäufers liegt außerhalb des Systems und ist für spätere Streitfälle schwer nachvollziehbar. (−) Die Spezifikation von `requestTicketReceivalStatus()` (schreibt bisher `Conversation`) muss angepasst werden. |
| Treiber | Usability |

## ADR-030 – Auszahlung vorerst im Balance Service, später eigener Payment Service

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert (Team-Architektur vom 18.10.2026) |
| Kontext | Ein- und Auszahlungen laufen zunächst manuell per Banküberweisung (ADR-001). Bank und weitere Zahlungsanbieter sollen später integriert werden. |
| Entscheidung | `requestWithdrawl()` bleibt in Iteration 1 im Balance Service. Sobald die Banküberweisung ins System integriert wird, wird die Auszahlung in einen eigenen **Payment Service** ausgelagert, der Bank und künftige Zahlungsanbieter anbindet. |
| Alternativen | **A) Payment Service sofort.** Gewinnt, weil die Grenze zu Zahlungsanbietern von Anfang an sauber ist. Nicht gewählt, weil der Service ohne Integration in Iteration 1 nur eine leere Hülle wäre. |
| Konsequenzen | (+) Iteration 1 bleibt einfach. (−) Späterer Umbau: Das Aggregate `Withdrawal` wandert voraussichtlich mit. (−) ADR-008 (Abschluss einer Auszahlung ohne Doppelbelastung) ist weiter offen und sollte vor dem Umbau entschieden werden. |
| Treiber | Security, Robustheit |

## ADR-031 – Kollaboration zwischen Services nur asynchron (Korrekturen am Team-Diagramm)

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Das Team-Diagramm vom 18.10.2026 enthält direkte Pfeile zwischen Services (Cancellation → Ticket: `requestPurch.Canc.`, `approvesCancellation`, `expireCancellationDeadline`; IAM → Balance: `createsAccount`). Der Balance Service leitet `ticketReceivalConf.` an den Conversation Service weiter, und es gibt keinen Rückkanal vom Balance Service. |
| Entscheidung | (1) Services kommunizieren untereinander nur über Event Channels; das API Gateway dient nur den Akteuren. (2) Der Balance Service publiziert `AmountReserved` oder `AmountReservationFailed`; der Ticket Service setzt den Kauf auf `Accepted` oder kompensiert (Ticket wieder `Available`, siehe ADR-012). (3) Der Cancellation Service publiziert `CancellationRequested`, `CancellationApproved` und `RelistingRequested`; der Ticket Service reagiert (Kauf sperren, stornieren, Ticket freigeben) und publiziert `PurchaseReverted`, worauf der Balance Service zurückbucht. (4) Der Cancellation Service hält eine Kopie stornierbarer Käufe aus `OfferWasAccepted` und `TicketReceivalConfirmed`; der Ticket Service bleibt letzte Instanz. (5) IAM publiziert `UserRegistered`; der Balance Service eröffnet das Konto, der Notification Service speichert die Kontaktdaten. (6) Der Balance Service leitet keine Kauf-Events weiter; der Conversation Service abonniert direkt beim Ticket Service, auch `TicketOfferClosed` und `PurchaseReverted` zum Schließen des Chats. (7) Event-Namen als Ereignisse: `OfferWasAccepted` (statt `offerWasAccepted`), `TicketReceivalConfirmed` (statt `ticketReceivalConf.`), `PurchaseReverted` (statt `revertPurchase`). |
| Alternativen | **A) Direkte synchrone Aufrufe wie im Team-Diagramm.** Gewinnt bei sofortigem Ergebnis und leichter Nachvollziehbarkeit. Nicht gewählt, weil ein Ausfall des Ticket Service Stornos und ein Ausfall des Balance Service Registrierungen blockieren würde (Verfügbarkeit). |
| Konsequenzen | (+) Keine Laufzeitkopplung zwischen Services. (+) Der Fehlerpfad bei zu wenig Guthaben ist definiert. (−) Mehr Events und eventual consistency; Handler müssen je `PurchaseId` bzw. `CancellationId` idempotent sein. (−) Datenkopien: Kaufdaten im Cancellation Service, Kontaktdaten im Notification Service, IBAN im Balance Service. |
| Treiber | Verfügbarkeit, Robustheit |

## ADR-032 – Rating Service, Bewertungsberechtigung über Kaufereignisse

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | `rateUser()` (Rang 22) ist die erste Operation mit User Rating; im Team-Diagramm steht die Subdomäne ohne Service. `rateUser()` muss prüfen, ob beide Benutzer am Kauf beteiligt waren. |
| Entscheidung | User Rating kommt in einen eigenen **Rating Service**. Er hält eine Kopie berechtigter Käufe (Käufer, Verkäufer, `PurchaseId`) aus `TicketReceivalConfirmed` und prüft `rateUser()` lokal. Setzt ADR-009, Option A voraus (Bewertung nur nach abgeschlossenem Kauf). |
| Alternativen | **A) Rating im Ticket Service.** Gewinnt, weil die Beteiligung ohne Kopie geprüft werden kann. Nicht gewählt, weil der Ticket Service weiter wächst und Rating zu Team Interaktion gehört. **B) Synchrone Prüfung beim Ticket Service.** Gewinnt, weil keine Kopie nötig ist. Nicht gewählt wegen Laufzeitkopplung. |
| Konsequenzen | (+) Der leselastige Service skaliert unabhängig. (−) Eine Bewertung ist erst möglich, wenn das Event angekommen ist. (−) Wird ADR-009 mit Option B entschieden (auch nach Storno), muss der Rating Service zusätzlich `PurchaseReverted` abonnieren. |
| Treiber | Usability, Verfügbarkeit |

## ADR-033 – Sperre wirkt über `UserBlocked` im API Gateway

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Laut ADR-014 wirkt eine Sperre erst, wenn die Login-Identität abläuft. `blockUser()` (Rang 18) liegt lokal im IAM Service. |
| Entscheidung | IAM publiziert `UserBlocked`. Das API Gateway führt eine Sperrliste und weist Anfragen gesperrter Benutzer sofort ab, auch bei gültiger Login-Identität. Hebt der Admin eine Sperre auf, publiziert IAM `UserUnblocked` und das Gateway entfernt den Eintrag. Die Sperrliste wird gespeichert bzw. beim Start des Gateways von IAM geladen, damit sie einen Neustart übersteht. Die Services bleiben unverändert. |
| Alternativen | **A) Kurze Gültigkeit der Login-Identität.** Gewinnt, weil kein zusätzlicher Zustand nötig ist. Nicht gewählt, weil die Sperre erst nach Ablauf wirkt und häufige Neuanmeldungen die Usability verschlechtern. **B) Kopie gesperrter Benutzer in jedem Service.** Gewinnt, weil jeder Service selbst prüft. Nicht gewählt wegen Duplikation in allen Services. **C) Das Gateway fragt IAM bei jeder Anfrage.** Gewinnt, weil der Status immer aktuell ist. Nicht gewählt, weil IAM dann auf jedem Pfad läge (Verfügbarkeit). |
| Konsequenzen | (+) Die Sperre wirkt nahezu sofort und einheitlich. (−) Zwischen Sperre und Ankunft des Events vergehen wenige Sekunden. (−) Das API Gateway hält weiteren, persistenten Zustand, wie schon bei ADR-011. (−) Laufende Käufe eines gesperrten Verkäufers werden nicht automatisch storniert – offen. |
| Treiber | Security, Verfügbarkeit |

## ADR-034 – Zuordnung der restlichen Operationen und Abfragen (Rang 17–30)

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Das Team-Diagramm deckt Rang 1–16 ab. Die restlichen Operationen platzieren außer User Rating (ADR-032) keine neue Subdomäne; zu klären ist, in welchem Service sie liegen und welche Daten sie brauchen. |
| Entscheidung | `requestTicketReceivalStatus()` → Ticket Service (liest `Purchase`), publiziert `TicketReceivalStatusRequested`, der Notification Service versendet die E-Mail (ADR-029). `blockUser()` → IAM (ADR-033). `withdrawTicketOffer()`, `updateTicketOffer()`, `expireTicketOffer()` → Ticket Service, lokal; Zurückziehen und Ablauf publizieren `TicketOfferClosed` (Chat schließen, Interessenten benachrichtigen). `rateUser()`, `viewUserRatings()` → Rating Service (ADR-032). `viewOwnTicketOffers()`, `viewOwnPurchases()` → Ticket Service. `viewConversation()` → Conversation Service. `viewBalanceTransactions()`, `viewPendingWithdrawals()` → Balance Service (IBAN aus der Kopie, ADR-031). `findUserByCustomerNumber()` → IAM. `viewOpenCancellations()` → Cancellation Service (Kaufdaten aus der Kopie). |
| Alternativen | **A) API Composition** für `viewOpenCancellations()` und `viewPendingWithdrawals()`: Das Gateway fragt zwei Services ab und führt die Ergebnisse zusammen. Gewinnt, weil keine Kopien nötig und die Daten immer aktuell sind. Nicht gewählt, weil dann zwei Services verfügbar sein müssen und die Kopien durch ADR-031 ohnehin entstehen. |
| Konsequenzen | (+) Alle 30 Operationen sind einem Service zugeordnet; alle Abfragen laufen lokal. (−) Die IBAN-Kopie muss aktualisiert werden, sobald die IBAN änderbar ist (Event `UserUpdated`). (−) ADR-013 (Ablauf eines reservierten Kaufs) ist für `expireTicketOffer()` weiter offen. |
| Treiber | Verfügbarkeit, Usability |

---

## Vorlage für neue ADRs

```md
## ADR-0xx – Titel

| Feld | Inhalt |
| --- | --- |
| Status | offen / akzeptiert / ersetzt durch ADR-xxx |
| Kontext | Was ist das Problem, welche Kräfte und Anforderungen wirken? |
| Entscheidung | Wir haben … entschieden. |
| Alternativen | Konkret benannte Alternativen; je Alternative zuerst, wo sie gewinnt, dann warum nicht gewählt. |
| Konsequenzen | Positive und negative Folgen. |
| Treiber | Verfügbarkeit / Usability / Security / Robustheit |
```
