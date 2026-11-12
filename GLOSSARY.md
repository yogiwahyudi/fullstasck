# MusicPedia

A digital music service where people browse a catalogue, listen to previews, buy individual Songs, and keep the purchased MP3s. This is the one-Song-at-a-time purchase variant; there is no membership.

## Language

### People

**Visitor** (_Pengunjung_):
Someone without an account, or not logged in. Can browse the catalogue and play Previews, but not buy.
_Avoid_: Guest, anonymous user

**User**:
Any account, holding exactly one Role.
_Avoid_: Account (as a synonym for Customer)

**Role**:
What a User may do: Admin or Customer.

**Customer** (_Pelanggan_):
A User with the Customer Role and a Customer Profile. The only kind of User who can buy Songs. Registration always creates a Customer.
_Avoid_: Buyer, client, member

**Admin**:
A User who manages Songs and Customers and reads Sales reports. Has no Customer Profile and cannot buy Songs.
_Avoid_: Operator, staff

**Customer Profile**:
A Customer's personal details (name, phone, address), editable only by that Customer or an Admin.

### Catalogue

**Song** (_Lagu_):
A sellable piece of music with a title, Artist, Composer, Genre, Record Label, lyrics, price, a Preview and a full MP3.
_Avoid_: Track, product

**Artist** (_Penyanyi_):
The performer credited on a Song.
_Avoid_: Singer

**Composer** (_Pencipta_):
The writer credited on a Song.
_Avoid_: Songwriter, creator

**Genre**:
A category a Song belongs to; each Song has exactly one.

**Record Label**:
The company a Song is released under.

**Catalogue**:
The set of Songs visible to the public for browsing and search. A retired Song is not in the Catalogue.
_Avoid_: Store, shop

**Retired Song**:
A Song an Admin has taken out of the Catalogue because it already has Sales. It stays in its owners' Libraries and stays downloadable. Only a Song with no Sales may be deleted outright.

**Preview** (_Cuplikan_):
A short public excerpt of a Song, playable by anyone including Visitors.
_Avoid_: Sample, snippet, trailer

**Full Song**:
The complete MP3 of a Song, playable and downloadable only by a Customer who owns it.
_Avoid_: Full track, original file

### Buying

**Order**:
A record created when a Customer starts buying one Song. Has a status of Pending, Paid or Failed. Always contains exactly one Song; there is no Cart.
_Avoid_: Purchase, transaction, cart

**Pending / Paid / Failed**:
The three Order statuses. A Paid or Failed Order never changes status again; after a failure the Customer starts a new Order. An Order keeps the price the Customer saw when it was created, even if the Song's price changes while it is Pending, and it stays payable if its Song is retired.

**Sale** (_Penjualan_):
An Order that has reached Paid. Sales are what the sales report counts and what history shows as bought.
_Avoid_: Revenue record, transaction

**Simulated Payment**:
The demo payment step that confirms or fails an Order. No real money or card is involved. Confirming the same Order twice yields one Sale.

**Owned Song**:
A Song for which the Customer has a Sale. Ownership is what grants Library access and the Full Song. A Sale is permanent: there are no refunds, so ownership is never revoked.
_Avoid_: Purchased song, unlocked song

**Library**:
The set of a Customer's Owned Songs, where they can play and download the Full Song.
_Avoid_: Collection, purchases

**Order History**:
A Customer's list of their own Orders and their statuses, kept even if the Song or the Customer's account is later removed.

### Account lifecycle

**Deactivate**:
Block a Customer from logging in while keeping their account, Library and Sales untouched.
_Avoid_: Suspend, ban, disable

**Delete (Customer)**:
Remove a Customer's account. Their Sales stay in reports with the name and email they had at the time, but their Owned Songs can no longer be reached. The same email may later register as a new Customer with no link to the old Sales.
_Avoid_: Deactivate (a different action)
