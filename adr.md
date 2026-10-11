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
| ADR-009 | Wer darf bewerten | offen | Step 3 (`rateUser`) |
| ADR-010 | Benachrichtigungen als eigene, ereignisgesteuerte Subdomäne | akzeptiert | Step 1/2 |
| ADR-011 | Brute-Force-Schutz im API Gateway | akzeptiert | Step 1 (`login`) |
| ADR-012 | Unzureichendes Guthaben bei Kaufabschluss | offen | Step 3 (`acceptOffer`) |
| ADR-013 | Ablauf der Ticketgültigkeit bei reserviertem Kauf | offen | Step 3 (`expireTicketOffer`) |

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
| Entscheidung | _offen_ – wird bei `acceptOffer` in Step 3 getroffen |
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
| Status | offen |
| Kontext | Brief: Benutzer bewerten sich gegenseitig „bei Verkaufsvorgängen". Die Spezifikation prüft die gemeinsame Beteiligung am Kauf, lässt aber offen, in welchem Status. |
| Entscheidung | _offen_ |
| Alternativen | **A) Nur nach `Completed`**, eine Bewertung je Beteiligtem und Kauf. Stärke: fälschungssicher. Schwäche: Betrugsfälle (kein Ticket erhalten) bleiben unbewertet. **B) Auch nach `Cancelled`.** Stärke: Warnsignal für Käufer. Schwäche: Racheratings möglich. **C) Jeder Benutzer.** Stärke: einfach. Schwäche: Manipulation, widerspricht „bei Verkaufsvorgängen". |
| Konsequenzen | _offen_ |
| Treiber | Robustheit (gute Bewertung der Community), Security |

## ADR-010 – Benachrichtigungen als eigene, ereignisgesteuerte Subdomäne

| Feld | Inhalt |
| --- | --- |
| Status | akzeptiert |
| Kontext | Viele Operationen „benachrichtigen" Käufer, Verkäufer oder Admin (`expressPurchaseInterest`, `requestPurchaseCancellation`, `approveCancellation`, `withdrawTicketOffer` u. a.). Benachrichtigungen gehörten bisher zu keinem Aggregate und keiner Subdomäne. Eine fehlgeschlagene Zustellung darf keinen Kauf oder Storno blockieren. |
| Entscheidung | Benachrichtigungen bilden eine eigene Subdomäne Notification mit dem Aggregate `Notification`. Operationen publizieren fachliche Events. Notification reagiert asynchron darauf, ermittelt Empfänger und Inhalt und stellt zu. Keine Operation ruft Notification synchron auf. |
| Alternativen | **A) Jede auslösende Subdomäne benachrichtigt selbst.** Gewinnt bei einfachen Interaktionen: keine zusätzlichen Events und kein zusätzlicher Service, Inhalt und Anlass liegen beieinander. Nicht gewählt, weil Zustelllogik und Kanäle in jeder Subdomäne dupliziert würden und ein Zustellproblem den fachlichen Ablauf verzögern könnte. **B) Synchroner Aufruf einer zentralen Notification-Komponente.** Gewinnt bei Nachvollziehbarkeit, da der Aufrufer den Zustellerfolg sofort kennt. Nicht gewählt, weil das Laufzeitkopplung auf kritischen Pfaden erzeugt (Verfügbarkeit). |
| Konsequenzen | (+) Benachrichtigung liegt nicht auf dem kritischen Pfad; ein Ausfall von Notification blockiert keinen Kauf (Verfügbarkeit). (+) Kanäle (E-Mail, Push, später weitere) werden an einer Stelle erweitert. (−) Ein zusätzlicher Service und zusätzliche Events. (−) Zustellung ist nur eventual consistent; Nutzer erfahren Änderungen leicht verzögert. (−) Notification hängt beim Design vom Event-Schema der anderen Subdomänen ab. |
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
| Status | offen |
| Kontext | `acceptOffer()` reserviert nach beidseitiger Zustimmung den `AgreedPrice` beim Käufer. Die Spezifikation regelt nicht, was passiert, wenn das verfügbare Guthaben nicht reicht. Einzahlungen werden manuell gebucht (ADR-001) und können Tage dauern. |
| Entscheidung | _offen_ – wird bei `acceptOffer` in Step 3 getroffen |
| Alternativen | **A) Käuferzustimmung wird abgelehnt**, solange das Guthaben nicht reicht. Gewinnt bei Einfachheit und Konsistenz: kein Zwischenzustand, keine Kompensation. Schwäche: Käufer muss erst einzahlen, dann erneut zustimmen. **B) Zustimmung bleibt gespeichert, Reservierung folgt nach Einzahlung** (mit Frist). Gewinnt bei Usability: Käufer kann sofort zusagen. Schwäche: zusätzlicher Zustand, Ticket bleibt blockiert, zeitgesteuerte Operation nötig. **C) Prüfung erst nach Zustimmung beider, bei Fehlschlag Kompensation** (Saga-Schritt schlägt fehl, Purchase zurück auf `Pending`). Gewinnt bei loser Kopplung zwischen Purchase und Balance. Schwäche: Verkäufer hat bereits zugestimmt und wird enttäuscht. |
| Konsequenzen | _offen_ – hängt mit ADR-004 und ADR-007 zusammen |
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
