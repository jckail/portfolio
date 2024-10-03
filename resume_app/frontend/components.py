import streamlit as st
import requests
import base64

def create_header(name, contact):
    # Fetch the resume from your backend
    resume_url = "http://127.0.0.1:8000/download_resume"
    response = requests.get(resume_url)

    if response.status_code == 200:
        # Encode the PDF content as base64
        pdf_base64 = base64.b64encode(response.content).decode('utf-8')
        download_link = f'data:application/pdf;base64,{pdf_base64}'
    else:
        download_link = None
    
    # Header with HTML formatting for name, contact details, and download button
    download_button = '📄 <a href="' + download_link + f'" download="{name.replace(" ", "_")}_Resume.pdf" >Download Resume</a>' if download_link else '<span class="error-message">Failed to load resume</span>'
    
    st.markdown(f"""
    <div class="header">
        <h1>{name}</h1>
        <p>
            📞 {contact['phone']} | 📧 <a href="mailto:{contact['email']}">{contact['email']}</a> | 📍 {contact['location']} | 🔗 <a href="{contact['github']}">GitHub</a> | {download_button}    
        </p>
    </div>

    <style>
    .header {{
        text-align: center;
        margin-bottom: 10px;  /* Reduced from 20px */
    }}
    .header h1 {{
        margin-bottom: 5px;  /* Reduced from 10px */
    }}
    .header p {{
        margin-bottom: 10px;  /* Reduced from 15px */
    }}
    .download-button {{
        display: inline-block;
        padding: 5px 10px;  /* Reduced padding */
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        transition: background-color 0.3s;
    }}
    .download-button:hover {{
        background-color: #45a049;
    }}
    .error-message {{
        color: red;
        font-weight: bold;
    }}
    /* Custom CSS to control overall layout spacing */
    .content {{
        margin-top: -20px;  /* Negative margin to pull content up */
    }}
    .section-marker {{
        margin-top: 10px;  /* Reduced top margin for sections */
        margin-bottom: 5px;  /* Added small bottom margin */
    }}
    </style>
    """, unsafe_allow_html=True)

def create_navigation():
    st.markdown("""
    <nav class="sidebar-nav">
        <a href="#experience">Experience</a>
        <a href="#skills">Skills</a>
        <a href="#achievements">Achievements</a>
    </nav>
    """, unsafe_allow_html=True)

def create_section(title, content):
    st.markdown(f'<div class="section-marker" id="{title.lower()}">{"⚡️" if title == "Experience" else "🛠" if title == "Skills" else "🏆"} {title} {"⚡️" if title == "Experience" else "🛠" if title == "Skills" else "🏆"}</div>', unsafe_allow_html=True)
    st.markdown(content, unsafe_allow_html=True)

def create_experience_item(job):
    return f"""
    <div class="experience-item">
        <h2>{job['company']}</h2>
        <h4>{job['title']} </h4>
        <p>{job['date']} | {job['location']}</p>
        <ul>
        {''.join(f"<li>{highlight}</li>" for highlight in job['highlights'])}
        </ul>
    </div>
    """

def create_skills_section(skills):
    content = ""
    for category, skill_list in skills.items():
        content += f"<h3>{category}</h3>"
        content += ", ".join(skill_list)
        content += "<br><br>"
    return content

def create_achievements_section(achievements):
    content = ""
    for achievement in achievements:
        content += f"<h3>{achievement['title']}</h3>"
        content += f"<p>{achievement['description']}</p>"
    return content