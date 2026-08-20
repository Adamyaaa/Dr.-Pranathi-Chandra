import glob
import re

# 1. Replace email globally
files = glob.glob('*.html') + ['assets/app.js']

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = content.replace('pranathichandra208@gmail.com', 'drpranathichandra@gmail.com')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

# 2. Update index.html for Calendly embed
with open('index.html', 'r', encoding='utf-8') as file:
    content = file.read()

# Replace header text
content = content.replace(
    '<h2>Ask for a slot. The clinic confirms it.</h2>',
    '<h2>Select an available time slot.</h2>'
)
content = content.replace(
    '<p>Nothing is booked automatically. You send a request, the clinic checks the actual schedule and confirms on WhatsApp with the date, time and address. If the preferred day is full, you will be offered the nearest alternative.</p>',
    '<p>Pick a convenient time from the calendar below. You will instantly receive a Google Meet link for your teleconsultation in your email.</p>'
)

# Replace the form with the calendly widget
calendly_embed = '''<!-- Calendly inline widget begin -->
      <div class="calendly-inline-widget" data-url="https://calendly.com/drpranathichandra" style="min-width:320px;height:700px;background:var(--surface);border:1px solid var(--line);border-radius:4px;"></div>
      <script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>
      <!-- Calendly inline widget end -->'''

# Use regex to replace the <form>...</form> block
content = re.sub(r'<form id="bookForm" novalidate>[\s\S]*?</form>', calendly_embed, content)

with open('index.html', 'w', encoding='utf-8') as file:
    file.write(content)

print("Done")
