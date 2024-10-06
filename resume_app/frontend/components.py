import streamlit as st
import requests
import base64

# Get the backend URL from Streamlit secrets
BACKEND_URL = st.secrets.get("BACKEND_URL", "http://127.0.0.1:8000")

def create_header(name, contact, theme_icon, theme_value, toggle_theme):
    # URL for downloading the resume
    download_url = f"{BACKEND_URL}/download_resume"
    
    # Header with HTML formatting for name, contact details, and download button
    #download_button = f'📄<a href="{download_url}" target="_blank">Download Resume</a>'
    response = requests.get(download_url)

    if response.status_code == 200:
        # Encode the PDF content as base64
        pdf_base64 = base64.b64encode(response.content).decode('utf-8')
        download_link = f'data:application/pdf;base64,{pdf_base64}'
    else:
        download_link = None
    
    # Header with HTML formatting for name, contact details, and download button
    download_button = '<a href="' + download_link + f'" download="{name.replace(" ", "_")}_Resume.pdf" > 📄 Resume</a>' if download_link else '<span class="error-message">Failed to load resume</span>'

    # Create a container for the header
    header_container = st.container()

    # Use columns to create a layout
    with header_container:
        st.markdown(f"""
<div class="header" style="background-color: transparent; padding: 10px; max-width: 90%; margin: 0 auto;">
    <div class="container" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;">
        <!-- First column: Name -->
        <div class="column" style="flex: 1; text-align: center;">
            <h2>{name}</h2>
        </div>
        <!-- Links and Download Button -->
        <div class="column links" style="flex: 1; text-align: center; margin-top: 10px;">
            <div class="link-container">
                <a href="{contact['github']}">🤖 GitHub</a>
                <a href="{contact['linkedin']}">👔 LinkedIn</a>
                {download_button}
            </div>
        </div>
    </div>
</div>
            """, unsafe_allow_html=True)

        # Add theme toggle widget in a separate row
        with st.columns([.9, .1])[1]:
            st.markdown('<div class = "st-bk" style="background-color: transparent; display: flex; justify-content: flex-end; align-items: right; padding-right: 10px;">', unsafe_allow_html=True)
            st.toggle(theme_icon, value=theme_value, key="theme_toggle", on_change=toggle_theme)
            st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("""
<style>

/* Floating header styles */
.header {
    position: fixed;
    top: 40px; /* Padding from top of the page */
    left: 0;
    right: 0;
    background-color: transparent;
    backdrop-filter: blur(15px);
    z-index: 98;
    text-align: center;
    border-radius: 10px;
    max-width: 100%;
    margin: 0 auto;
    padding: 10px;
}

/* Styling for Name and Title */
.header h3, .header h4 {
    margin: 0;
    font-size: 2vw; /* Adjusted size for 'Jordan Kail' and 'Data Engineer' */
    color: #ffffff !important;
}

/* Styling for links */
.header .link-container {
    display: flex;
    justify-content: center;
    gap: 15px; /* Space between links */
}

.header a {
    color: #ffffff !important;
    text-decoration: none;
    font-size: 1.5vw;
    display: inline-block;
    margin: 0 5px;
}

.header a:hover {
    text-decoration: underline;
}

/* Flexbox ensures elements wrap on narrow screens */
.container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
}

.column {
    flex: 1;
    text-align: center;
}

/* Mobile-specific adjustments for screens smaller than 768px */
@media (max-width: 768px) {
    .header h3, .header h4 {
        font-size: 3.5vw; /* Larger header text for small screens */
    }

    .header p {
        font-size: 3vw; /* Reduce link size on mobile for readability */
    }

    .header a {
        font-size: 3vw; /* Reduce link size on mobile */
    }

    .column.links {
        margin-top: 10px;
        text-align: center; /* Align links below the headers */
    }

    .header .link-container {
        flex-direction: column; /* Stack links vertically on narrow screens */
        gap: 10px; /* Space between stacked links */
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
        <p>{job['location']}</p>
        <p>{job['date']}</p>
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