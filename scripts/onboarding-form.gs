/**
 * Builds the RouteBoard school onboarding form in your own Google account.
 *
 *   1. script.google.com -> New project -> paste this file
 *   2. Run `createOnboardingForm` (it will ask for permission once)
 *   3. The execution log prints the public form link and the responses sheet
 *
 * Re-running makes a second, independent form. Edit questions here and re-run
 * rather than hand-editing a form you want to keep reproducible.
 *
 * Deliberately no file-upload question and no email collection: both force the
 * person filling it to sign in to Google, and a principal on a phone will not.
 * The export sample is requested by email instead.
 */

var TITLE = "RouteBoard — school onboarding";
var INTRO =
  "About 10 minutes. It tells us whether RouteBoard fits your school, and gives us " +
  "everything we need to set it up without a second round of questions.\n\n" +
  "Rough numbers are fine everywhere — nothing here is a commitment, and we do not " +
  "need any student's personal details at this stage.";

/* Question types: short, long, choice, choiceOther, checkbox, checkboxOther, scale, date, time */
var SECTIONS = [
  {
    page: "The school",
    questions: [
      { t: "short", q: "School name", req: true },
      { t: "short", q: "City / town", req: true },
      { t: "choiceOther", q: "Board", opts: ["CBSE", "ICSE / ISC", "State board", "IB / IGCSE"] },
      { t: "short", q: "Your name", req: true },
      { t: "choiceOther", q: "Your role", opts: ["Principal", "Transport in-charge / head", "Administrator", "Trustee / management", "IT / systems"], req: true },
      { t: "short", q: "Phone (WhatsApp, if different please note it)", req: true },
      { t: "short", q: "Email", req: true },
      { t: "choice", q: "Who signs off on a decision like this?", opts: ["I do", "Principal", "Trustees / management committee", "Parent body is consulted too"] },
    ],
  },
  {
    page: "Scale",
    help: "Approximate is fine. These are the numbers the cost works out from.",
    questions: [
      { t: "short", q: "Total students in the school", req: true },
      { t: "short", q: "Of those, how many travel by school bus?", req: true },
      { t: "short", q: "How many buses?", req: true },
      { t: "choice", q: "Are the buses school-owned or contracted?", opts: ["All school-owned", "All contracted / hired", "A mix of both"], req: true },
      { t: "short", q: "How many routes in total? (a bus often runs more than one)" },
      { t: "short", q: "Roughly how many stops on a typical route?" },
      { t: "short", q: "How many drivers?" },
      { t: "choice", q: "Is there an attendant or helper on board?", opts: ["On every bus", "On some buses", "No attendants", "Only on primary-section buses"] },
      { t: "choice", q: "Does a bus make more than one trip per session?", opts: ["No — one trip each way", "Yes, two trips", "Yes, three or more", "Varies by route"] },
      { t: "time", q: "First bell / school start time" },
      { t: "time", q: "Dismissal time" },
      { t: "checkboxOther", q: "Are there separate dismissal times?", opts: ["No, everyone leaves together", "Pre-primary leaves earlier", "Senior school leaves later", "Activity / coaching buses in the evening"] },
    ],
  },
  {
    page: "How routes are run today",
    questions: [
      { t: "checkboxOther", q: "How are routes and stops planned and recorded?", opts: ["On paper", "Excel / Google Sheets", "In our school ERP", "A separate transport or GPS software", "In the transport in-charge's head"], req: true },
      { t: "short", q: "If you use software for this, which one?" },
      { t: "long", q: "Who decides which child boards at which stop, and how is that recorded?" },
      { t: "long", q: "When a route, stop or timing changes mid-year, how do parents find out?" },
      { t: "choice", q: "How often does a child's stop or route change during a year?", opts: ["Almost never", "A few times a term", "Most weeks", "Constantly — it is a daily negotiation"] },
    ],
  },
  {
    page: "Drivers and staff",
    help: "RouteBoard runs on the driver's own phone as a web page. No app store, no device to buy.",
    questions: [
      { t: "long", q: "How is a driver assigned to a bus and route each day? Is it fixed, or does it change?" },
      { t: "choice", q: "Do the drivers have smartphones?", opts: ["Yes, all of them", "Most of them", "A few of them", "No", "I am not sure"], req: true },
      { t: "choice", q: "Whose phone is it?", opts: ["The driver's personal phone", "A school-issued phone", "A mix"] },
      { t: "choice", q: "Android or iPhone?", opts: ["All Android", "Mostly Android, a few iPhones", "Mixed", "Not sure"] },
      { t: "choice", q: "Do they have mobile data on it?", opts: ["Yes", "Some do", "No", "Not sure"] },
      { t: "checkboxOther", q: "Which languages do the drivers read?", opts: ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Marathi", "Bengali", "They do not read comfortably in any language"] },
      { t: "short", q: "Who supervises the buses day to day, and what is their role called?" },
      { t: "choice", q: "How much phone use is acceptable for a driver during a trip?", opts: ["Taps at a stop with the bus stationary are fine", "Only the attendant should touch a phone", "We would need to discuss this", "Not sure"] },
    ],
  },
  {
    page: "Student data",
    help:
      "This is what we import on day one. Do not attach or paste any student data here — " +
      "we will ask for a sample export over email once you are ready.",
    questions: [
      { t: "checkboxOther", q: "Where do student records live today?", opts: ["A school ERP / management software", "Excel / Google Sheets", "Paper registers", "Spread across a few of these"], req: true },
      { t: "short", q: "If it is an ERP, which one? (Entab, Campus 365, Fedena, Teachmint, in-house, …)" },
      { t: "choice", q: "Can you export students to Excel or CSV from it?", opts: ["Yes, easily", "Yes, but someone has to put it together", "No / I don't know", "We would type it in fresh"], req: true },
      { t: "checkbox", q: "Which of these does the record already hold, per child?", opts: ["Full name", "Class and section", "Admission number", "Bus route", "Bus stop", "Guardian name", "Guardian mobile number", "A second guardian's mobile number", "Home address", "Transport fee / slab"], req: true },
      { t: "choice", q: "How many guardian numbers per child, usually?", opts: ["One", "Two", "Two or three", "It varies a lot"], req: true },
      { t: "choice", q: "How reliable are those numbers?", opts: ["Verified and current", "Mostly right, some stale", "Many are out of date", "We have never checked"], req: true },
      { t: "checkboxOther", q: "Which language should a parent's message be in?", opts: ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Marathi", "Bengali", "English, but parents would prefer otherwise"], req: true },
      { t: "long", q: "Anything unusual about how your student data is organised that an import would trip over? (siblings sharing a number, mid-year joiners, students who sometimes take the bus, staff children, …)" },
    ],
  },
  {
    page: "Talking to parents now",
    questions: [
      { t: "checkboxOther", q: "What does a parent hear from you about the bus today?", opts: ["Nothing routine", "A call when something is wrong", "A WhatsApp group per route", "An SMS from the ERP", "An app the parents installed", "A GPS tracking app from a vendor"], req: true },
      { t: "short", q: "If you already use a tracking or GPS vendor, who is it?" },
      { t: "short", q: "When does that contract end?" },
      { t: "long", q: "What do parents call the office about most often?" },
      { t: "choice", q: "Does the school already send SMS through a provider?", opts: ["Yes", "No", "Not sure"], req: true },
      { t: "choice", q: "If yes, is the sender ID DLT-registered in the school's name?", opts: ["Yes", "No", "I don't know what that is"] },
      { t: "short", q: "If you have one, what is the sender ID? (the 6 letters parents see as the sender)" },
    ],
  },
  {
    page: "Records and obligations",
    questions: [
      { t: "checkboxOther", q: "How is boarding recorded today?", opts: ["It isn't", "The attendant keeps a paper list", "The driver remembers", "A register in the office", "Biometric or RFID cards"], req: true },
      { t: "long", q: "Has there been an incident or a dispute where a record of who boarded would have helped? You do not have to give details." },
      { t: "checkboxOther", q: "Anything the school is required to do by rule or by the board?", opts: ["GPS on every bus", "CCTV on every bus", "Speed governor", "Attendance records retained for a period", "An annual transport safety audit", "Nothing specific"] },
      { t: "scale", q: "How much of the transport in-charge's day goes on answering parents about buses?", low: "Hardly any", high: "Most of it" },
    ],
  },
  {
    page: "A pilot",
    questions: [
      { t: "date", q: "When could a pilot realistically start?" },
      { t: "short", q: "Which single route would you run it on, and why that one?" },
      { t: "choice", q: "Would you tell those parents it is a trial?", opts: ["Yes", "No, it should just work", "Not sure yet"] },
      { t: "long", q: "What would make you call the pilot a success?" },
      { t: "long", q: "What worries you about it?" },
      { t: "long", q: "Anything we have not asked about that we should know?" },
    ],
  },
];

function createOnboardingForm() {
  var form = FormApp.create(TITLE).setDescription(INTRO).setProgressBar(true).setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(
    "Thank you. We will read this and come back within two working days.\n\n" +
    "If you can, email a sample export of your student list (even five rows, with the " +
    "real column headings) so we can check the import before we speak."
  );

  SECTIONS.forEach(function (section, i) {
    if (i > 0) form.addPageBreakItem().setTitle(section.page);
    else form.addSectionHeaderItem().setTitle(section.page);
    if (section.help) form.addSectionHeaderItem().setHelpText(section.help);
    section.questions.forEach(function (q) { addQuestion(form, q); });
  });

  var sheet = SpreadsheetApp.create(TITLE + " — responses");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log("Form (send this to schools): " + form.getPublishedUrl());
  Logger.log("Edit the form:               " + form.getEditUrl());
  Logger.log("Responses:                   " + sheet.getUrl());
}

function addQuestion(form, q) {
  var item;
  switch (q.t) {
    case "short":        item = form.addTextItem(); break;
    case "long":         item = form.addParagraphTextItem(); break;
    case "choice":       item = form.addMultipleChoiceItem().setChoiceValues(q.opts); break;
    case "choiceOther":  item = form.addMultipleChoiceItem().setChoiceValues(q.opts).showOtherOption(true); break;
    case "checkbox":     item = form.addCheckboxItem().setChoiceValues(q.opts); break;
    case "checkboxOther":item = form.addCheckboxItem().setChoiceValues(q.opts).showOtherOption(true); break;
    case "scale":        item = form.addScaleItem().setBounds(1, 5).setLabels(q.low, q.high); break;
    case "date":         item = form.addDateItem(); break;
    case "time":         item = form.addTimeItem(); break;
    default: throw new Error("unknown question type: " + q.t);
  }
  item.setTitle(q.q);
  if (q.help) item.setHelpText(q.help);
  if (q.req) item.setRequired(true);
  return item;
}

/** Sanity check: every question has a type this script knows how to build. */
function test_questionTypesAreKnown() {
  var known = ["short", "long", "choice", "choiceOther", "checkbox", "checkboxOther", "scale", "date", "time"];
  var bad = [];
  SECTIONS.forEach(function (s) {
    s.questions.forEach(function (q) {
      if (known.indexOf(q.t) === -1) bad.push(q.q + " -> " + q.t);
      if (q.t.indexOf("choice") === 0 || q.t.indexOf("checkbox") === 0) {
        if (!q.opts || !q.opts.length) bad.push(q.q + " -> no options");
      }
    });
  });
  if (bad.length) throw new Error("bad questions:\n" + bad.join("\n"));
  Logger.log("OK: " + SECTIONS.length + " sections, " + SECTIONS.reduce(function (n, s) { return n + s.questions.length; }, 0) + " questions");
}
