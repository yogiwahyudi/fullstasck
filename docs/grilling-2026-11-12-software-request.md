# Grilling: MusicPedia vs Software Request (2026-11-12)

Status: **round 1 asked, no answers yet**. Nothing in GLOSSARY.md, ADRs, or code has been changed.

Source compared: `../../../../Software Request - 26102023.pdf` (sponsor: VP Business Development, PT Musika Indonesia) against `GLOSSARY.md`, `docs/adr/0001-retire-songs-with-sales.md`, and the current build.

Q2–Q8 assume Q1 = yes.

## Round 1

**Q1 – Subject.** Grill MusicPedia's domain model and build against the Software Request PDF (not the D3 SSO / rate-limiter demos or the reference material)?
➡️ Yes — those are exercises, not domains with their own language.

**Q2 – "Trial" vs Preview.** The use case diagram says *Memutar Trial Lagu* (extends *Melihat Daftar Lagu*); the glossary says **Preview** (_Cuplikan_). Same thing, or does "Trial" mean e.g. the full Song for a limited time?
➡️ Same thing; add "Trial" to Preview's _Avoid_ list.

**Q3 – "Only the administrator can change data".** Security req #2 (*Data hanya dapat diubah oleh administrator sistem*) conflicts with Pelanggan → *Mengubah Data Pribadi* and with Customers editing their own Customer Profile. Read it as: Catalogue data and other Customers' data are Admin-only; a Customer changes only their own Customer Profile?
➡️ Yes — the diagram is the more specific requirement; record this reading in the README NFR section.

**Q4 – "Akses lengkap ke jutaan lagu".** Sounds like streaming/membership. Does "full access" just mean the whole Catalogue is browsable and previewable, with ownership still requiring one Sale per Song?
➡️ Yes — marketing language; the per-Song model stays.

**Q5 – "Musik & audio".** Is anything besides a Song sellable (podcasts, audiobooks, sound effects)?
➡️ No — Song is the only sellable thing.

**Q6 – Western vs local music.** Is *musik barat* vs *musik lokal* a real browsable/filterable classification, or flavour text?
➡️ Flavour text — Genre stays the only category.

**Q7 – Download missing from the diagram.** The request's main promise is offline MP3s, but the diagram has no download/Library use case. Fold it into *Melakukan Pembelian Lagu*?
➡️ No — add it as its own use case, *Memutar & Mengunduh Lagu* (Pelanggan): it has its own access rule (backend ownership check) and endpoints, and CHECKLIST already lists it separately.

**Q8 – Non-functional requirements.** 99% availability, ≤2 s response, ≥50 concurrent users, virus-free server, 24 h offsite backups, secure client-server comms, go-live "before 25 Jan 2018" (typo — earlier than the request date). No TLS, backup job, or load check exists yet. Document as out of scope with a README NFR status table, or implement some?
➡️ Document them, and implement only the cheap ones that show something: a 50-concurrent catalogue load script (<2 s) and a `pg_dump` backup script. TLS and offsite storage are deployment concerns; flag the 2018 date as a typo.

## Answers

_(pending)_
