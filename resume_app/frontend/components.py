import streamlit as st
import requests
import base64

# Get the backend URL from Streamlit secrets
BACKEND_URL = st.secrets.get("BACKEND_URL", "http://127.0.0.1:8000")

def create_header(name, contact, theme_icon, theme_value, toggle_theme):
    # URL for downloading the resume
    download_url = f"{BACKEND_URL}/download_resume"
    
    # Header with HTML formatting for name, contact details, and download button
    download_button = f' 📄<a href="{download_url}" target="_blank">Download Resume</a>'
    
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
    <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
        <!-- First column: Name -->
        <div class="column" style="flex: 1; text-align: left;">
            <h4>    Data Engineer</h4>
        </div>
        <!-- Second column: Social Links -->
        <div class="column" style="flex: 1; text-align: center;">
                        <h3>{name}</h3>
            <p>🤖 <a href="{contact['github']}">GitHub</a> | 👔 <a href="{contact['linkedin']}">LinkedIn</a> |{download_button}</p>
        </div>
        <!-- Third column: Download Button -->
        <div class="column" style="flex: 1; text-align: right;">
            <p></p>
        </div>
    </div>
</div>
            """, unsafe_allow_html=True)

        with col3:
            st.markdown('<div style="background-color: transparent; height: 100px; display: flex; justify-content: flex-end; align-items: center; padding-right: 10px;">', unsafe_allow_html=True)
            # Add theme toggle widget
            st.toggle(theme_icon, value=theme_value, key="theme_toggle", on_change=toggle_theme)
            st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("""
<style>
/* Floating header styles */
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: transparent;
    backdrop-filter: blur(15px);
    z-index: 98;
    text-align: center;
    border-radius: 100px;
    max-width: 80%;
    margin: 0 auto;
    padding: 10px;
}

.header h3 {
    margin: 0;
    font-size: 2.5vw; /* Slightly smaller h3 for 'Jordan Kail' */
    color: #ffffff !important;
}

.header h4 {
    margin: 0;
    font-size: 2vw; /* Slightly smaller h4 for 'Data Engineer' */
    color: #ffffff !important;
}

.header p {
    margin: 10px 0;
    font-size: 1.2vw; /* Reduce the size of the text for the links */
}

.header a {
    color: #ffffff !important;
    text-decoration: none;
    font-size: 1.2vw; /* Match size for links to be smaller */
    display: inline-block;
    margin: 0 8px; /* Slightly reduce space between the links */
    vertical-align: middle; /* Keep links in a horizontal line */
}

.header a:hover {
    text-decoration: underline;
}

/* Ensure the links remain in one horizontal line */
.nav-menu {
    display: flex;
    justify-content: center;
    margin-top: 15px;
    flex-wrap: nowrap; /* Prevent wrapping */
}

.nav-menu a {
    margin: 0 10px;
    font-size: 1.2vw; /* Smaller font size for consistency */
    font-weight: bold;
    color: #ffffff !important;
    white-space: nowrap; /* Prevent breaking into multiple lines */
}

/* Mobile-specific adjustments for screens smaller than 768px */
@media (max-width: 768px) {
    .header {
        max-width: 100%;
        padding: 10px 5px;
    }

    .header h3 {
        font-size: 4.5vw; /* Larger header text for small screens */
    }

    .header h4 {
        font-size: 3.5vw; /* Larger text for 'Data Engineer' */
    }

    .header p {
        font-size: 2.5vw; /* Reduce link size on mobile for readability */
    }

    .header a {
        font-size: 2.5vw; /* Reduce link size on mobile */
    }

    .nav-menu {
        flex-wrap: wrap; /* Allow wrapping if needed on mobile */
    }

    .nav-menu a {
        margin: 5px;
        font-size: 2.5vw;
    }
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
        <h2><a href="{job["link"]}">{job["company"]}</a></h2>
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

def create_projects_section(projects):
    content = ""
    for project in projects:
        content += f'<h3><a href="{project["link"]}">{project["title"]}</a></h3>'
        content += f"<p>{project['description']}</p>"
    return content