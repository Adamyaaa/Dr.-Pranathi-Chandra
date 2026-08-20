import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the heading texts to match the new flow
html = html.replace(
    '<h2>Select a time. Sync your reports on WhatsApp.</h2>',
    '<h2>Book an appointment.</h2>'
)
html = html.replace(
    '<p>Pick a convenient 30-minute slot from the live calendar below. Once confirmed, WhatsApp will automatically open so you can seamlessly share your past medical reports with the clinic.</p>',
    '<p>Fill out your symptoms below, then pick a convenient 30-minute slot from the live calendar. Once confirmed, your details will be sent directly to the clinic\'s WhatsApp.</p>'
)

# Replace the entire booking-left section
new_booking_left = '''<div class="booking-left">
        <div id="formWrapper">
          <label style="display: block; font-weight: 600; margin-bottom: 12px; font-size: 14px;">1. Patient Details & Symptoms</label>
          <form id="bookForm" novalidate>
            <div class="row2">
              <div class="field">
                <label for="pname">Patient name</label>
                <input id="pname" name="pname" type="text" autocomplete="name" required>
              </div>
              <div class="field">
                <label for="pphone">Mobile number</label>
                <input id="pphone" name="pphone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10 digits" required>
              </div>
            </div>

            <div class="field">
              <label for="pemail">Email address</label>
              <input id="pemail" name="pemail" type="email" autocomplete="email" required>
            </div>

            <div class="field">
              <label>Type of visit</label>
              <div class="segment">
                <label><input type="radio" name="vtype" value="First consultation" checked>First consultation</label>
                <label><input type="radio" name="vtype" value="Follow-up">Follow-up</label>
                <label><input type="radio" name="vtype" value="Report review">Report review</label>
              </div>
            </div>

            <div class="field">
              <label for="pnote">What is the problem (Symptoms)</label>
              <textarea id="pnote" name="pnote" placeholder="A line or two is enough — or use the note builder above."></textarea>
            </div>

            <label class="consent">
              <input type="checkbox" id="pconsent" required>
              <span>I agree to be contacted on WhatsApp, SMS and phone about this appointment. <a href="privacy.html">How your information is handled</a>.</span>
            </label>

            <button class="btn btn-primary" type="submit" style="width:100%">Next: Pick a time slot</button>
            <p class="form-note" id="formNote">This will open the calendar to choose your exact time.</p>
          </form>
        </div>

        <div id="calendlyWrapper" style="display:none;">
          <label style="display: block; font-weight: 600; margin-bottom: 12px; font-size: 14px;">2. Pick your time slot</label>
          <div id="calendlyContainer" style="min-width:320px;height:700px;background:var(--surface);border:1px solid var(--line);border-radius:4px;"></div>
          <p style="font-size: 14px; color: var(--ink-2); margin-top: 16px; text-align: center;">Once you confirm a time, WhatsApp will open automatically to complete the booking.</p>
        </div>
      </div>'''

html = re.sub(r'<div class="booking-left">[\s\S]*?</div>\s*<div id="visit">', new_booking_left + '\n\n      <div id="visit">', html)

# Make sure Calendly script is loaded globally in the <head> so we can call Calendly.initInlineWidget
if 'https://assets.calendly.com/assets/external/widget.js' not in html:
    html = html.replace('</head>', '<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>\n</head>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update app.js
with open('assets/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the old window.open and form.innerHTML replacements
# We'll use regex to replace from "var msg = [" to the end of the submit handler
new_submit_logic = '''var msg = [
      "Online Appointment Request — Dr. K. Pranathi Chandra",
      "",
      "Name: " + name,
      "Mobile: " + phone.slice(-10),
      "Email: " + email,
      "Visit: " + fullVType,
      "Slot: Selected via calendar",
      pnote ? "\\n" + pnote : "",
      "",
      "Sent by: " + email
    ].filter(Boolean).join("\\n");

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

    // Send to DB in background
    try {
      const API_URL = "https://dr-pranathi-chandra-live.onrender.com/api/book";
      await fetch(API_URL, {
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
    } catch (err) {
      console.error(err);
    }
  });

  // Listen for Calendly completion
  window.addEventListener('message', function(e) {
    if (e.data.event && e.data.event.indexOf('calendly') === 0) {
      if (e.data.event === 'calendly.event_scheduled') {
        if (window.pendingWaUrl) {
           window.location.href = window.pendingWaUrl;
        }
      }
    }
  });
})();'''

js = re.sub(r'var msg = \[[\s\S]*\}\)\(\);\s*$', new_submit_logic, js)

with open('assets/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated sequential flow")
