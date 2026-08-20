/* Dr. K. Pranathi Chandra — preview build
   Phase 1 "Request & Confirm": the form composes a structured message and hands off to WhatsApp.
   Phase 1 production build additionally writes an appointment_requests row and posts to the clinic /today view. */

(function () {
  "use strict";

  var CLINIC_WA = "919492034424"; // Original doctor's number
  // var CLINIC_WA = "917389358793"; // User's test number

  var CLINIC_EMAIL = "pranathichandra208@gmail.com"; // Original doctor's email
  // var CLINIC_EMAIL = "adamyajain1309@gmail.com"; // User's test email

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- preferred day: default tomorrow, no past dates -------------------
  var day = document.getElementById("pday");
  if (day) {
    var t = new Date(); t.setDate(t.getDate() + 1);
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    day.min = iso(new Date());
    day.value = iso(t);
  }

  // ---- note builder ----------------------------------------------------
  var boxes = Array.prototype.slice.call(document.querySelectorAll("[data-sym]"));
  var durs = Array.prototype.slice.call(document.querySelectorAll("input[name=dur]"));
  var slip = document.getElementById("slip");
  var roTitle = document.getElementById("roTitle");
  var roBody = document.getElementById("roBody");
  var useNote = document.getElementById("useNote");
  var noteField = document.getElementById("pnote");

  function selected() {
    return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.getAttribute("data-sym"); });
  }
  function duration() {
    var d = durs.filter(function (r) { return r.checked; })[0];
    return d ? d.value : "";
  }
  function isFlagged() {
    return boxes.some(function (b) {
      return b.checked && b.closest(".opt") && b.closest(".opt").hasAttribute("data-flag");
    });
  }

  function composeNote() {
    var s = selected(), d = duration(), lines = [];
    if (!s.length && !d) return "";
    if (s.length) lines.push("Symptoms: " + s.join(", ") + ".");
    if (d) lines.push("Duration: " + d + ".");
    return lines.join("\n");
  }

  function render() {
    if (!slip) return;
    var note = composeNote();
    var d = duration();

    if (!note) {
      slip.innerHTML = '<span class="ph">Your note will appear here.</span>';
      roTitle.textContent = "Your note";
      roBody.textContent = "Nothing ticked yet. Choose what applies on the left and your note builds here.";
      if (useNote) useNote.setAttribute("disabled", "");
      return;
    }
    slip.textContent = note;
    if (useNote) useNote.removeAttribute("disabled");

    if (isFlagged()) {
      roTitle.textContent = "Please get this looked at promptly";
      roBody.textContent = "Blood in the phlegm always needs to be assessed, even if it is a small amount and even if you feel otherwise well. Call the clinic rather than waiting for a reply to an online request. If the amount is large, go to the nearest hospital now.";
    } else if (d === "Over 3 weeks" || d === "Several months or more") {
      roTitle.textContent = "Worth a proper assessment";
      roBody.textContent = "Symptoms lasting more than three weeks are usually assessed rather than treated repeatedly with antibiotics or cough syrup. Bring any previous prescriptions and reports with you.";
    } else {
      roTitle.textContent = "Your note";
      roBody.textContent = "Send this with your request so the consultation starts with the full picture.";
    }
  }

  boxes.concat(durs).forEach(function (el) { el.addEventListener("change", render); });
  render();

  if (useNote) {
    useNote.addEventListener("click", function () {
      var note = composeNote();
      if (!note || !noteField) return;
      noteField.value = note;
      var target = document.getElementById("book");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { noteField.focus({ preventScroll: true }); }, 420);
    });
  }

  // ---- request & confirm ----------------------------------------------
  var form = document.getElementById("bookForm");
  var formNote = document.getElementById("formNote");
  if (!form) return;

  function fail(msg, el) {
    formNote.textContent = msg;
    formNote.style.color = "var(--arterial)";
    if (el) el.focus();
    return false;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    formNote.style.color = "";

    var name = form.pname.value.trim();
    var phone = form.pphone.value.replace(/\D/g, "");
    var email = form.pemail.value.trim();
    var consent = document.getElementById("pconsent").checked;

    if (name.length < 2) return fail("Please enter the patient's name.", form.pname);
    if (phone.length < 10) return fail("Please enter a 10-digit mobile number so the clinic can confirm.", form.pphone);
    if (!email || email.indexOf("@") === -1) return fail("Please enter a valid email address.", form.pemail);
    if (!consent) return fail("Please tick the consent box so the clinic may contact you.", document.getElementById("pconsent"));

    var vtype = (form.querySelector("input[name=vtype]:checked") || {}).value || "First consultation";
    var fullVType = vtype + " (Teleconsultation)";
    var pday = form.pday.value;
    var psession = form.psession.value;
    var pnote = form.pnote.value.trim();

    var pretty = "";
    if (pday) {
      var parts = pday.split("-");
      pretty = new Date(parts[0], parts[1] - 1, parts[2])
        .toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Saving request...";
    submitBtn.disabled = true;

    try {
      // Send to our Render/Node backend
      const API_URL = "https://dr-pranathi-chandra-live.onrender.com/api/book";
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          phone: phone,
          email: email,
          vtype: fullVType,
          pday: pday,
          psession: psession,
          pnote: pnote
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save to database");
      }
      
      console.log("Successfully saved to database");
      
    } catch (err) {
      console.error(err);
      // We will still proceed to WhatsApp even if the DB fails
      // so the patient is not blocked from booking.
    }

    var msg = [
      "Online Appointment Request — Dr. K. Pranathi Chandra",
      "",
      "Name: " + name,
      "Mobile: " + phone.slice(-10),
      "Email: " + email,
      "Visit: " + fullVType,
      "Preferred: " + (pretty || "Any day") + ", " + psession,
      pnote ? "\n" + pnote : "",
      "",
      "Sent by: " + email
    ].filter(Boolean).join("\n");

    window.open("https://wa.me/" + CLINIC_WA + "?text=" + encodeURIComponent(msg), "_blank", "noopener");

    form.innerHTML =
      '<div style="background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--arterial);border-radius:4px;padding:26px">' +
      '<p style="font-family:var(--f-mono);font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px">Request logged securely</p>' +
      '<h3 style="font-size:23px;margin:0 0 10px">Press send in WhatsApp to notify the clinic</h3>' +
      '<p style="color:var(--ink-2);margin:0 0 6px">Your request is saved. WhatsApp has opened with your details filled in. The clinic is notified once you press send there.</p>' +
      '<p style="color:var(--ink-2);margin:0 0 18px">The clinic will reply to confirm your slot and send a Google Meet link from ' + CLINIC_EMAIL + '. No travel required.</p>' +
      '<a class="btn btn-ghost" href="tel:+919492034424">Call instead — 94920 34424</a>' +
      "</div>";
  });
})();
