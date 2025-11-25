from email.message import EmailMessage
import smtplib
import os
from datetime import datetime, timedelta
from urllib.parse import quote
import pytz

SENDER_EMAIL = os.getenv('SENDER_EMAIL')
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD')

def send_appointment_reminder(email, appointment_date, timezone=None, timezone_offset=None):
    # Parse the appointment date
    appointment_date_obj = datetime.strptime(appointment_date, "%Y-%m-%d")
    
    # Handle timezone conversion
    if timezone:
        try:
            # Create a timezone-aware datetime in the user's timezone
            tz = pytz.timezone(timezone)
            appointment_date_obj = tz.localize(appointment_date_obj)
        except:
            # Fallback if timezone is invalid
            if timezone_offset is not None:
                # Convert timezone offset from minutes to hours
                offset_hours = timezone_offset / 60
                from datetime import timezone as dt_timezone
                tz = dt_timezone(timedelta(hours=offset_hours))
                appointment_date_obj = appointment_date_obj.replace(tzinfo=tz)
    
    # Set appointment time (9:00 AM in the user's timezone)
    start_time = appointment_date_obj.replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=1)
    
    # Convert to UTC for Google Calendar (it expects UTC times)
    if start_time.tzinfo is not None:
        start_time_utc = start_time.astimezone(pytz.UTC)
        end_time_utc = end_time.astimezone(pytz.UTC)
    else:
        start_time_utc = start_time
        end_time_utc = end_time
    
    start_time_google = start_time_utc.strftime("%Y%m%dT%H%M%SZ")
    end_time_google = end_time_utc.strftime("%Y%m%dT%H%M%SZ")
    
    event_title = "Appointment with Healthcare Team"
    event_details = "This is a reminder for your appointment scheduled."
    event_location = "Your Healthcare Location"
    
    text = quote(event_title)
    dates = quote(f"{start_time_google}/{end_time_google}")
    details = quote(event_details)
    location = quote(event_location)

    google_calendar_url = (
        f"https://www.google.com/calendar/render?action=TEMPLATE&text={text}"
        f"&dates={dates}&details={details}&location={location}"
    )
    
    message = EmailMessage()
    message['Subject'] = "Appointment Reminder"
    message['From'] = SENDER_EMAIL
    message['To'] = email

    # Format readable date and time in user's timezone
    readable_date = start_time.strftime("%A, %B %d, %Y")
    readable_time = start_time.strftime("%I:%M %p").lstrip("0")
    timezone_str = timezone if timezone else "Your local timezone"

    plain_text = f"""Appointment Reminder

Dear Patient,

This is a reminder for your appointment scheduled on {readable_date} at {readable_time} ({timezone_str}).

Location: {event_location}

Add this appointment to your calendar:
{google_calendar_url}

If you need to reschedule, please contact your healthcare team.

Best regards,
Your Healthcare Team
"""

    html_content = f"""\
<html>
  <body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#f4f6f8;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#0f62fe;padding:18px 24px;color:#ffffff;">
                <h1 style="margin:0;font-size:20px;font-weight:600;">Appointment Reminder</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;color:#0f1724;">
                <p style="margin:0 0 12px 0;font-size:15px;">Dear Patient,</p>
                <p style="margin:0 0 18px 0;color:#4b5563;font-size:14px;">
                  This is a reminder for your upcoming appointment.
                </p>

                <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin-bottom:18px;">
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #e6edf3;border-radius:6px;background:#fbfdff;">
                      <strong style="display:block;font-size:14px;color:#0f1724;">When</strong>
                      <span style="font-size:14px;color:#334155;">{readable_date} at {readable_time} ({timezone_str})</span>
                    </td>
                    <td style="width:12px;"></td>
                    <td style="padding:10px 12px;border:1px solid #e6edf3;border-radius:6px;background:#fbfdff;">
                      <strong style="display:block;font-size:14px;color:#0f1724;">Where</strong>
                      <span style="font-size:14px;color:#334155;">{event_location}</span>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 18px 0;">
                  <a href="{google_calendar_url}" style="display:inline-block;padding:12px 20px;background:#0f62fe;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                    Add to Google Calendar
                  </a>
                </p>

                <p style="margin:18px 0 0 0;color:#94a3b8;font-size:13px;">
                  If you need to reschedule, please contact your healthcare team.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;padding:12px 24px;color:#64748b;font-size:12px;">
                <span>Best regards,&nbsp;Your Healthcare Team</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

    message.set_content(plain_text)
    message.add_alternative(html_content, subtype='html')

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(message)
        server.quit()
        print(f"Appointment reminder email sent to {email}")
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
