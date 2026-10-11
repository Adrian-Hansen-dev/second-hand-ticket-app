# Systemoperationen

Diese Spezifikation beschreibt die Systemoperationen nach dem Assemblage-Ansatz. Jede Operation enthält Signatur, fachliches Verhalten und nichtfunktionale Anforderungen. Die angegebenen Antwortzeiten sind Architekturvorschläge und keine gemessenen Grenzwerte.

## Domänenmodell – Aggregates

| Aggregate | Beschreibung | Wichtige Daten |
| --- | --- | --- |
| `User` | Benutzerkonto und Benutzerstatus | UserId, Name, E-Mail, IBAN, Credentials, Status |
| `TicketOffer` | Zum Verkauf angebotenes Ticket | TicketId, SellerId, Start, End, ValidFrom, ValidUntil, Provider, Price, OriginalPrice, Status |
| `Purchase` | Kaufvorgang zwischen Käufer und Verkäufer | PurchaseId, TicketId, BuyerId, SellerId, BuyerAccepted, SellerAccepted, Status |
| `Conversation` | Kommunikation zwischen Käufer und Verkäufer | ConversationId, Participants, Messages |
| `BalanceAccount` | Guthabenkonto eines Benutzers | UserId, AvailableBalance, ReservedBalance, Transactions |
| `Withdrawal` | Auszahlungsanforderung | WithdrawalId, UserId, Amount, Status |
| `Cancellation` | Stornoantrag eines Käufers | CancellationId, PurchaseId, Reason, SellerResponse, Status, Deadline |
| `RelistingRequest` | Antrag zum erneuten Anbieten eines Tickets | RequestId, TicketId, Reason, Status |
| `Rating` | Bewertung eines Benutzers | RatingId, ReviewerId, RatedUserId, PurchaseId, Score, Comment |

Aggregates sind fachliche Konsistenzgrenzen; daraus folgt nicht zwangsläufig eine Aufteilung in eigene Microservices.

## User – Registrierung und Authentifizierung

### `register()`

**Signatur:** `register(userData: UserRegistrationData): UserId`

**Verhalten**

- Liest: `User` zur Prüfung eindeutiger Benutzername- und E-Mail-Werte.
- Schreibt: `User` und initialisiert ein `BalanceAccount`.
- Erstellt ein Benutzerkonto mit den angegebenen persönlichen Daten.
- Speichert das Passwort ausschließlich gehasht.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Benutzername und E-Mail sind eindeutig.
- Personenbezogene Daten und Passwörter werden sicher verarbeitet.

### `login()`

**Signatur:** `login(username: String, password: String): AuthenticationResult`

**Verhalten**

- Liest: `User`.
- Schreibt: keine fachlichen Aggregates im Normalfall.
- Prüft Anmeldedaten und Benutzerstatus; bei Erfolg wird eine Sitzung beziehungsweise ein Token zurückgegeben.
- Gesperrte Benutzer dürfen sich nicht anmelden.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 1 Sekunde.
- Schutz vor Brute-Force-Angriffen sowie sichere Übertragung und Verarbeitung der Anmeldedaten.

## User – Ticketsuche und Angebotserstellung

### `searchTicket()`

**Signatur:** `searchTicket(start: String, end: String, travelDate: Date, provider: String): List<TicketOffer>`

**Verhalten**

- Liest: `TicketOffer`.
- Schreibt: keine.
- Sucht verfügbare Ticketangebote nach den angegebenen Filtern, berücksichtigt Gültigkeit und Verfügbarkeit und gibt passende Angebote zurück.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 1 Sekunde für typische Suchanfragen.
- Hohe Verfügbarkeit und effiziente Suche auch bei vielen Angeboten.

### `createTicketOffer()`

**Signatur:** `createTicketOffer(start: String, end: String, description: String, validFrom: DateTime, validUntil: DateTime, provider: String, price: Decimal, originalPrice: Decimal): TicketId`

**Verhalten**

- Liest: `User`.
- Schreibt: `TicketOffer`.
- Prüft die Berechtigung zum Erstellen eines Angebots und validiert Ticketdaten, Preise und Gültigkeitszeitraum.
- Erstellt ein Angebot im Status `Available`, das anschließend in der Suche sichtbar ist.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Dauerhafte Speicherung und idempotente Behandlung wiederholter identischer Anfragen.

## User – Kauf und Kommunikation

### `expressPurchaseInterest()`

**Signatur:** `expressPurchaseInterest(ticketId: TicketId): PurchaseId`

**Verhalten**

- Liest: `TicketOffer`, `User`.
- Schreibt: `Purchase`, gegebenenfalls `Conversation`.
- Prüft die Verfügbarkeit des Tickets, erstellt einen Kaufvorgang im Status `Pending`, benachrichtigt den Verkäufer und ermöglicht die Kommunikation beider Parteien.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Zuverlässige Benachrichtigung des Verkäufers.
- Für bereits verkaufte Tickets darf kein neuer Kaufabschluss erfolgen.

### `sendMessage()`

**Signatur:** `sendMessage(conversationId: ConversationId, content: String): MessageId`

**Verhalten**

- Liest: `Conversation`, `User`.
- Schreibt: `Conversation`.
- Prüft die Teilnahme an der Konversation, speichert die Nachricht und stellt sie dem Empfänger bereit.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 1 Sekunde und möglichst geringe Zustellverzögerung.
- Nachrichten sind nur für berechtigte Teilnehmer sichtbar und zuverlässig gespeichert.

### `acceptOffer()`

**Signatur:** `acceptOffer(purchaseId: PurchaseId): PurchaseStatus`

**Verhalten**

- Liest: `Purchase`, `TicketOffer`, `BalanceAccount`.
- Schreibt: `Purchase`, `TicketOffer`, `BalanceAccount`.
- Speichert die Zustimmung der aufrufenden Kaufpartei.
- Sobald Käufer und Verkäufer zugestimmt haben, wird der Kaufbetrag beim Käufer belastet oder reserviert, das Ticket als `Reserved` markiert und der Kaufstatus aktualisiert.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Konsistente Geld- und Ticketzustände; keine Mehrfachabbuchungen.
- Parallele Kaufabschlüsse werden sicher behandelt.

### `confirmTicketReceival()`

**Signatur:** `confirmTicketReceival(purchaseId: PurchaseId): PurchaseStatus`

**Verhalten**

- Liest: `Purchase`, `BalanceAccount`.
- Schreibt: `Purchase`, `BalanceAccount`.
- Prüft, dass der Aufrufer Käufer ist, bestätigt den Erhalt, gibt den reservierten Betrag für den Verkäufer frei und markiert den Vorgang als `Completed`.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Geldtransfer erfolgt genau einmal und ist vollständig nachvollziehbar.

## User – Stornierung und erneutes Anbieten

### `requestPurchaseCancellation()`

**Signatur:** `requestPurchaseCancellation(purchaseId: PurchaseId, reason: String): CancellationId`

**Verhalten**

- Liest: `Purchase`, `User`.
- Schreibt: `Cancellation`.
- Prüft die Berechtigung des Käufers, erstellt einen Stornoantrag mit Antwortfrist und benachrichtigt den Verkäufer.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden sowie zuverlässige Benachrichtigung.
- Ein Kauf wird nicht mehrfach gleichzeitig storniert; die Frist wird zuverlässig überwacht.

### `respondToCancellation()`

**Signatur:** `respondToCancellation(cancellationId: CancellationId, confirmed: Boolean): CancellationStatus`

**Verhalten**

- Liest: `Cancellation`, `Purchase`.
- Schreibt: `Cancellation`.
- Prüft die Identität des betroffenen Verkäufers und speichert Zustimmung oder Widerspruch.
- Bei Zustimmung kann der Storno genehmigt werden; bei Widerspruch kann der Fall an einen Administrator übergeben werden.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Nur der betroffene Verkäufer darf antworten.
- Antworten nach Fristablauf sind definiert zu behandeln; Änderungen sind nachvollziehbar.

### `requestTicketRelisting()`

**Signatur:** `requestTicketRelisting(ticketId: TicketId): RelistingRequestId`

**Verhalten**

- Liest: `TicketOffer`, `Purchase`.
- Schreibt: `RelistingRequest`, `TicketOffer`, `Purchase`, `BalanceAccount`.
- Prüft Verkäuferrolle und Voraussetzungen zum erneuten Anbieten.
- Erstellt den Antrag, setzt das Ticket wieder auf `Available` und veranlasst die Rückbuchung des Kaufbetrags an den Käufer.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Kauf-, Ticket- und Guthabenstatus werden konsistent aktualisiert.
- Rückbuchungen erfolgen höchstens einmal.

## User – Bewertungen und Guthaben

### `rateUser()`

**Signatur:** `rateUser(purchaseId: PurchaseId, ratedUserId: UserId, score: Integer, comment: String): RatingId`

**Verhalten**

- Liest: `Purchase`, `User`, `Rating`.
- Schreibt: `Rating`.
- Prüft die gemeinsame Beteiligung am Kaufvorgang, speichert die Bewertung und macht sie öffentlich sichtbar.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Schutz vor unberechtigten und mehrfachen Bewertungen sowie nachvollziehbare Speicherung.

### `viewUserRatings()`

**Signatur:** `viewUserRatings(userId: UserId): List<Rating>`

**Verhalten**

- Liest: `Rating`.
- Schreibt: keine.
- Ruft die öffentlichen Bewertungen eines Benutzers ab.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 1 Sekunde, hohe Verfügbarkeit und effiziente Abfrage bei vielen Bewertungen.

### `viewBalance()`

**Signatur:** `viewBalance(): BalanceInformation`

**Verhalten**

- Liest: `BalanceAccount`.
- Schreibt: keine.
- Gibt verfügbares und gegebenenfalls reserviertes Guthaben des angemeldeten Benutzers zurück.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 1 Sekunde.
- Ausschließlich der Kontoinhaber darf das Guthaben einsehen; der Kontostand ist korrekt und aktuell.

### `requestWithdrawl()`

**Signatur:** `requestWithdrawl(amount: Decimal): WithdrawalId`

**Verhalten**

- Liest: `User`, `BalanceAccount`.
- Schreibt: `Withdrawal`, gegebenenfalls `BalanceAccount`.
- Prüft das verfügbare Guthaben, erstellt eine Auszahlungsanforderung für Accounting und sichert den Betrag, etwa durch eine Reservierung.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Keine Auszahlung über das verfügbare Guthaben; zuverlässige und nachvollziehbare Verarbeitung.

## Admin – Verwaltung und Stornierungen

### `blockUser()`

**Signatur:** `blockUser(userId: UserId): UserStatus`

**Verhalten**

- Liest: `User`, gegebenenfalls `Cancellation`.
- Schreibt: `User`.
- Prüft die Administratorberechtigung, sperrt den Benutzer und verhindert künftige unberechtigte Aktionen.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Ausschließlich autorisierte Administratoren dürfen sperren; Sperrungen werden nachvollziehbar protokolliert.

### `requestTicketReceivalStatus()`

**Signatur:** `requestTicketReceivalStatus(purchaseId: PurchaseId): RequestId`

**Verhalten**

- Liest: `Purchase`, `User`.
- Schreibt: gegebenenfalls `Conversation` oder einen Supportvorgang.
- Prüft, dass der Kauf noch nicht abgeschlossen ist, und fordert beim Verkäufer eine Auskunft zur Ticketübergabe an.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden für die Anfrage.
- Zuverlässige Zustellung und nachvollziehbare Kommunikation.

### `approveCancellation()`

**Signatur:** `approveCancellation(cancellationId: CancellationId, approved: Boolean): CancellationStatus`

**Verhalten**

- Liest: `Cancellation`, `Purchase`, `TicketOffer`, `BalanceAccount`.
- Schreibt: `Cancellation`, `Purchase`, `BalanceAccount`, gegebenenfalls `TicketOffer`.
- Prüft die Administratorberechtigung und genehmigt oder lehnt den Antrag ab.
- Bei Genehmigung werden Kauf und Stornierungsstatus aktualisiert, der Betrag an den Käufer zurückgebucht und alle Beteiligten informiert.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Konsistente, genau einmal ausgeführte Rückbuchung sowie nachvollziehbare Entscheidungen und Geldbewegungen.

## Accounting – Guthabenverwaltung

### `updateBalance()`

**Signatur:** `updateBalance(userId: UserId, amount: Decimal): BalanceInformation`

**Verhalten**

- Liest: `User`, `BalanceAccount`.
- Schreibt: `BalanceAccount`.
- Prüft die Berechtigung der Buchhaltung, aktualisiert das Guthaben und dokumentiert die Änderung als Transaktion.
- Positive Beträge erhöhen, negative Beträge verringern das Guthaben. Die Operation unterstützt die manuelle Bearbeitung von Ein- und Auszahlungen.

**Nichtfunktionale Anforderungen**

- Antwortzeit unter 2 Sekunden.
- Hohe Datenkonsistenz und Transaktionssicherheit, keine unzulässigen negativen Guthabenstände.
- Vollständige Protokollierung; Zugriff ausschließlich für autorisierte Buchhaltungsmitarbeiter.

## Zu erstellende Sequenzdiagramme

Für die komplexeren Abläufe sollen Sequenzdiagramme folgende Interaktionen darstellen:

1. Kaufabschluss
2. Stornierungsprozess
3. Manuelle Guthabenverwaltung

Das Bankensystem ist dabei lediglich ein externer Beteiligter; eine direkte technische Bankintegration ist zunächst nicht vorgesehen.

## Offene Architekturentscheidungen

| Thema | Offene Frage |
| --- | --- |
| Kaufinteresse | Können mehrere Käufer gleichzeitig Interesse an einem Ticket bekunden? |
| Kaufabschluss | Wie wird verhindert, dass zwei Käufer dasselbe Ticket kaufen? |
| Storno | Wird nach einer Bestätigung durch den Verkäufer automatisch storniert oder entscheidet immer ein Admin? |
| Ticket-Relisting | Darf der Verkäufer das Ticket sofort erneut anbieten oder nur unter bestimmten Bedingungen? |
| Guthaben | Wird Geld beim Kauf sofort abgebucht oder zunächst reserviert? |
| Accounting | Wie wird eine manuelle Auszahlung als abgeschlossen dokumentiert, ohne das Guthaben doppelt zu belasten? |
| Bewertungen | Darf jeder Benutzer bewerten oder nur nach einem abgeschlossenen Kauf? |

Besonders für Auszahlungen muss das Auflösen einer zuvor angelegten Reservierung definiert werden. Andernfalls besteht das Risiko, dass bei einer späteren negativen `updateBalance()`-Buchung derselbe Betrag doppelt abgezogen wird.
