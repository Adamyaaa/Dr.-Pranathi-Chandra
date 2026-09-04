/* Dr. K. Pranathi Chandra — preview build
   Phase 1 "Request & Confirm": the form composes a structured message and hands off to WhatsApp.
   Phase 1 production build additionally writes an appointment_requests row and posts to the clinic /today view. */

(function () {
  "use strict";

  var CLINIC_WA = "919492034424"; // Original doctor's number
  // var CLINIC_WA = "917389358793"; // User's test number

  var CLINIC_EMAIL = "drpranathichandra@gmail.com"; // Original doctor's email
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

  function clearErrors() {
    ['pname', 'pphone', 'pemail', 'pnote'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.borderColor = "";
    });
    formNote.textContent = "";
    formNote.style.color = "";
    formNote.style.fontWeight = "";
  }

  function fail(msg, el) {
    clearErrors();
    formNote.textContent = "⚠️ " + msg;
    formNote.style.color = "var(--arterial)";
    formNote.style.fontWeight = "600";
    if (el) {
      el.style.borderColor = "var(--arterial)";
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return false;
  }

  // Clear red border when user types into any field
  ['pname', 'pphone', 'pemail', 'pnote'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", function() {
        if (this.value.trim().length > 0) {
          this.style.borderColor = "";
        }
      });
    }
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    var name = form.pname.value.trim();
    var phone = form.pphone.value.replace(/\D/g, "");
    var email = form.pemail.value.trim();
    var pnote = form.pnote.value.trim();
    var consent = document.getElementById("pconsent").checked;

    if (!name || name.length < 2) {
      return fail("Please enter the patient's name.", form.pname);
    }
    if (!phone || phone.length < 10) {
      return fail("Please enter a valid 10-digit mobile number.", form.pphone);
    }
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      return fail("Please enter a valid email address.", form.pemail);
    }
    if (!pnote || pnote.length < 3) {
      return fail("Please briefly describe your symptoms or reason for consultation.", form.pnote);
    }
    if (!consent) {
      return fail("Please agree to the contact consent checkbox to proceed.", document.getElementById("pconsent"));
    }

    var cmode = (form.querySelector("input[name=cmode]:checked") || {}).value || "Online (₹400)";
    var vtype = (form.querySelector("input[name=vtype]:checked") || {}).value || "First consultation";
    var fullVType = cmode + " — " + vtype;
    var isClinic = cmode.indexOf("In-Clinic") !== -1;
    var fee = isClinic ? 500 : 400;
    window.pendingBooking = {
      name: name,
      phone: phone,
      email: email,
      amount: fee,
      cmode: cmode,
      vtype: vtype,
      isClinic: isClinic,
      appointmentId: null
    };

    var pday = ""; // Handled by Calendly
    var psession = ""; // Handled by Calendly

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

    var msg = [
      "Appointment Request — Dr. K. Pranathi Chandra",
      "",
      "Name: " + name,
      "Mobile: " + phone.slice(-10),
      "Email: " + email,
      "Consultation: " + cmode,
      "Visit Type: " + vtype,
      isClinic ? "Location: Surya Diagnosis, Secunderabad (5:30 PM - 8:30 PM)" : "Mode: Online Video Call (Google Meet, 9:00 AM - 9:00 PM)",
      "Slot: Selected via calendar",
      pnote ? "\n" + pnote : "",
      "",
      "Sent by: " + email
    ].filter(Boolean).join("\n");

    // Save URL for later
    window.pendingWaUrl = "https://wa.me/" + CLINIC_WA + "?text=" + encodeURIComponent(msg);

    // Transition UI to Calendly
    document.getElementById("formWrapper").style.display = "none";
    document.getElementById("calendlyWrapper").style.display = "block";
    
    // Auto-fill Calendly with the data they just typed
    if (window.Calendly) {
      window.Calendly.initInlineWidget({
        url: 'https://calendly.com/drpranathichandra/30min?hide_event_type_details=1&hide_gdpr_banner=1',
        parentElement: document.getElementById('calendlyContainer'),
        prefill: {
          name: name,
          email: email
        }
      });
    }

    // Determine backend API base (localhost during local testing, Render in production)
    var API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://dr-pranathi-chandra-live.onrender.com';
    window.clinicApiBase = API_BASE;

    // Send to DB in background
    try {
      var res = await fetch(API_BASE + "/api/book", {
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
      var bookData = await res.json();
      if (bookData && bookData.data && bookData.data.id) {
        window.pendingBooking.appointmentId = bookData.data.id;
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Listen for Calendly completion
  window.addEventListener('message', async function(e) {
    if (e.data.event && e.data.event.indexOf('calendly') === 0) {
      if (e.data.event === 'calendly.event_scheduled') {
        var booking = window.pendingBooking;
        var apiBase = window.clinicApiBase || 'https://dr-pranathi-chandra-live.onrender.com';

        if (booking && window.Razorpay) {
          try {
            var orderRes = await fetch(apiBase + "/api/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                appointment_id: booking.appointmentId,
                amount: booking.amount
              })
            });

            var orderData = await orderRes.json();
            if (!orderData.success || !orderData.order) {
              throw new Error("Could not initialize payment order");
            }

            var rzp = new window.Razorpay({
              key: orderData.key_id,
              amount: orderData.order.amount,
              currency: "INR",
              name: "Dr. K. Pranathi Chandra Clinic",
              description: booking.isClinic
                ? "In-Clinic Consultation Fee (Surya Diagnosis)"
                : "Online Consultation Fee (Google Meet)",
              image: "assets/favicon.svg",
              order_id: orderData.order.id,
              prefill: {
                name: booking.name,
                email: booking.email,
                contact: booking.phone
              },
              theme: {
                color: "#0E2032"
              },
              handler: async function (response) {
                // Verify payment on backend
                try {
                  await fetch(apiBase + "/api/verify-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      appointment_id: booking.appointmentId
                    })
                  });
                } catch (vErr) {
                  console.error("Payment verification call error:", vErr);
                }

                // Redirect to WhatsApp with payment confirmation attached
                var paidNote = "\nPayment Status: PAID\nPayment ID: " + response.razorpay_payment_id + "\nAmount: ₹" + booking.amount;
                window.location.href = window.pendingWaUrl + encodeURIComponent(paidNote);
              },
              modal: {
                ondismiss: function() {
                  if (confirm("Payment was not completed. Would you like to contact the clinic directly on WhatsApp to confirm your slot?")) {
                    var pendingNote = "\nPayment Status: PENDING\nAmount Due: ₹" + booking.amount;
                    window.location.href = window.pendingWaUrl + encodeURIComponent(pendingNote);
                  }
                }
              }
            });

            rzp.open();
          } catch (err) {
            console.error("Error opening Razorpay checkout:", err);
            // Fallback to WhatsApp if payment service is unreachable
            if (window.pendingWaUrl) {
              window.location.href = window.pendingWaUrl;
            }
          }
        } else if (window.pendingWaUrl) {
          window.location.href = window.pendingWaUrl;
        }
      }
    }
  });
})();