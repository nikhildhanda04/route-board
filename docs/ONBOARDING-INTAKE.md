# School onboarding intake

The same questions as the Google Form built by `scripts/onboarding-form.gs`, for use on a
call, over email, or as a printed sheet. Generated — edit the questions in the `.gs` file
and run `npm run form:doc`.

> About 10 minutes. It tells us whether RouteBoard fits your school, and gives us everything we need to set it up without a second round of questions.
>
> Rough numbers are fine everywhere — nothing here is a commitment, and we do not need any student's personal details at this stage.

## The school

- School name **(required)**
- City / town **(required)**
- Board
  - CBSE · ICSE / ISC · State board · IB / IGCSE · _other_
- Your name **(required)**
- Your role **(required)**
  - Principal · Transport in-charge / head · Administrator · Trustee / management · IT / systems · _other_
- Phone (WhatsApp, if different please note it) **(required)**
- Email **(required)**
- Who signs off on a decision like this?
  - I do · Principal · Trustees / management committee · Parent body is consulted too

## Scale

_Approximate is fine. These are the numbers the cost works out from._

- Total students in the school **(required)**
- Of those, how many travel by school bus? **(required)**
- How many buses? **(required)**
- Are the buses school-owned or contracted? **(required)**
  - All school-owned · All contracted / hired · A mix of both
- How many routes in total? (a bus often runs more than one)
- Roughly how many stops on a typical route?
- How many drivers?
- Is there an attendant or helper on board?
  - On every bus · On some buses · No attendants · Only on primary-section buses
- Does a bus make more than one trip per session?
  - No — one trip each way · Yes, two trips · Yes, three or more · Varies by route
- First bell / school start time
  - _time_
- Dismissal time
  - _time_
- Are there separate dismissal times?
  - No, everyone leaves together · Pre-primary leaves earlier · Senior school leaves later · Activity / coaching buses in the evening · _other_

## How routes are run today

- How are routes and stops planned and recorded? **(required)**
  - On paper · Excel / Google Sheets · In our school ERP · A separate transport or GPS software · In the transport in-charge's head · _other_
- If you use software for this, which one?
- Who decides which child boards at which stop, and how is that recorded?
  - _long answer_
- When a route, stop or timing changes mid-year, how do parents find out?
  - _long answer_
- How often does a child's stop or route change during a year?
  - Almost never · A few times a term · Most weeks · Constantly — it is a daily negotiation

## Drivers and staff

_RouteBoard runs on the driver's own phone as a web page. No app store, no device to buy._

- How is a driver assigned to a bus and route each day? Is it fixed, or does it change?
  - _long answer_
- Do the drivers have smartphones? **(required)**
  - Yes, all of them · Most of them · A few of them · No · I am not sure
- Whose phone is it?
  - The driver's personal phone · A school-issued phone · A mix
- Android or iPhone?
  - All Android · Mostly Android, a few iPhones · Mixed · Not sure
- Do they have mobile data on it?
  - Yes · Some do · No · Not sure
- Which languages do the drivers read?
  - English · Hindi · Kannada · Tamil · Telugu · Marathi · Bengali · They do not read comfortably in any language · _other_
- Who supervises the buses day to day, and what is their role called?
- How much phone use is acceptable for a driver during a trip?
  - Taps at a stop with the bus stationary are fine · Only the attendant should touch a phone · We would need to discuss this · Not sure

## Student data

_This is what we import on day one. Do not attach or paste any student data here — we will ask for a sample export over email once you are ready._

- Where do student records live today? **(required)**
  - A school ERP / management software · Excel / Google Sheets · Paper registers · Spread across a few of these · _other_
- If it is an ERP, which one? (Entab, Campus 365, Fedena, Teachmint, in-house, …)
- Can you export students to Excel or CSV from it? **(required)**
  - Yes, easily · Yes, but someone has to put it together · No / I don't know · We would type it in fresh
- Which of these does the record already hold, per child? **(required)**
  - Full name · Class and section · Admission number · Bus route · Bus stop · Guardian name · Guardian mobile number · A second guardian's mobile number · Home address · Transport fee / slab
- How many guardian numbers per child, usually? **(required)**
  - One · Two · Two or three · It varies a lot
- How reliable are those numbers? **(required)**
  - Verified and current · Mostly right, some stale · Many are out of date · We have never checked
- Which language should a parent's message be in? **(required)**
  - English · Hindi · Kannada · Tamil · Telugu · Marathi · Bengali · English, but parents would prefer otherwise · _other_
- Anything unusual about how your student data is organised that an import would trip over? (siblings sharing a number, mid-year joiners, students who sometimes take the bus, staff children, …)
  - _long answer_

## Talking to parents now

- What does a parent hear from you about the bus today? **(required)**
  - Nothing routine · A call when something is wrong · A WhatsApp group per route · An SMS from the ERP · An app the parents installed · A GPS tracking app from a vendor · _other_
- If you already use a tracking or GPS vendor, who is it?
- When does that contract end?
- What do parents call the office about most often?
  - _long answer_
- Does the school already send SMS through a provider? **(required)**
  - Yes · No · Not sure
- If yes, is the sender ID DLT-registered in the school's name?
  - Yes · No · I don't know what that is
- If you have one, what is the sender ID? (the 6 letters parents see as the sender)

## Records and obligations

- How is boarding recorded today? **(required)**
  - It isn't · The attendant keeps a paper list · The driver remembers · A register in the office · Biometric or RFID cards · _other_
- Has there been an incident or a dispute where a record of who boarded would have helped? You do not have to give details.
  - _long answer_
- Anything the school is required to do by rule or by the board?
  - GPS on every bus · CCTV on every bus · Speed governor · Attendance records retained for a period · An annual transport safety audit · Nothing specific · _other_
- How much of the transport in-charge's day goes on answering parents about buses?
  - 1 (Hardly any) to 5 (Most of it)

## A pilot

- When could a pilot realistically start?
  - _date_
- Which single route would you run it on, and why that one?
- Would you tell those parents it is a trial?
  - Yes · No, it should just work · Not sure yet
- What would make you call the pilot a success?
  - _long answer_
- What worries you about it?
  - _long answer_
- Anything we have not asked about that we should know?
  - _long answer_

---

**What we ask for separately, by email:** a sample export of the student list (five rows is
enough, with the real column headings) and the current route sheet. Neither belongs in the
form — a Google file-upload question forces the person filling it to sign in to Google, and
a principal filling this in on a phone will not.
