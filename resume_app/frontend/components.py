import streamlit as st
import requests
import base64

def create_header(name, contact, theme_icon, theme_value, toggle_theme):
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
    
    # Create a container for the header
    header_container = st.container()

    # Use columns to create a layout
    with header_container:
        col1, col2, col3 = st.columns([2, 6, 2])

        with col1:
            st.empty()

        with col2:
            st.markdown(f"""
            <div class="header" style="background-color: transparent; padding: 10px; max-width: 80%; margin: 0 auto;">
                <h1>{name}</h1>
                <p>
                    📞 {contact['phone']} | 📧 <a href="mailto:{contact['email']}">{contact['email']}</a> | 📍 {contact['location']} | 🔗 <a href="{contact['github']}">GitHub</a> | {download_button}    
                </p>
            </div>
            """, unsafe_allow_html=True)

        with col3:
            st.markdown('<div style="background-color: transparent; height: 100px; display: flex; justify-content: flex-end; align-items: center; padding-right: 10px;">', unsafe_allow_html=True)
            # Add theme toggle widget
            st.toggle(theme_icon, value=theme_value, key="theme_toggle", on_change=toggle_theme)
            st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("""
    <style>
    .header {
        text-align: center;
        margin-bottom: 10px;
        max-width: 80%;
        margin-left: auto;
        margin-right: auto;
    }
    .header h1 {
        margin-bottom: 5px;
    }
    .header p {
        margin-bottom: 10px;
    }
    .download-button {
        display: inline-block;
        padding: 5px 10px;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        transition: background-color 0.3s;
    }
    .download-button:hover {
        background-color: #45a049;
    }
    .error-message {
        color: red;
        font-weight: bold;
    }
    /* Custom CSS to control overall layout spacing */
    .content {
        margin-top: -20px;
    }
    .section-marker {
        margin-top: 10px;
        margin-bottom: 5px;
    }
    /* Style for the toggle widget */
    .stToggle {
        display: flex;
        justify-content: flex-end;
        padding-top: 20px;
    }
    .stToggle > label {
        font-size: 24px !important;
        font-weight: bold !important;
    }
    .stToggle .st-bw {
        background-color: #4f4caf !important;
    }
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