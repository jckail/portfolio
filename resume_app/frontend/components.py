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
    download_button = '<a class="link-container" href="' + download_link + f'" download="{name.replace(" ", "_")}_Resume.pdf" > 📄 Resume</a>' if download_link else '<span class="error-message">Failed to load resume</span>'

    # Create a container for the header

    [col0, col1, col2,col3]= st.columns([.05, .30,.55,.1])
    with col0:
        with st.sidebar.expander("📚 Navigation", expanded=True):  # Sidebar starts collapsed
            st.markdown("""
            <nav class="sidebar-nav">
                <ul>
                    <li><a href="#experience">⚡️ Experience</a></li>
                    <li><a href="#skills">🛠 Skills</a></li>
                    <li><a href="#projects">🏆 Projects</a></li>
                </ul>
            </nav>
            """, unsafe_allow_html=True)
    with col1:
        st.markdown(f"""
    <div class="name-container">
        <h1> {name} </h1>
    </div>
            """, unsafe_allow_html=True)
        
    with col2:
        st.markdown(f"""
            
            <div class="link-container">
                <a class="link-container" href="{contact['github']}">🤖 GitHub</a>
                <a class="link-container" href="{contact['linkedin']}">👔 LinkedIn</a>
                {download_button}
            </div>
            """, unsafe_allow_html=True)
        
    
    
    with col3:
        st.toggle(theme_icon, value=theme_value, key="theme_toggle", on_change=toggle_theme)



def create_section(title, content):
    st.markdown(f'<div class="section-marker" id="{title.lower()}">{"⚡️" if title == "Experience" else "🛠" if title == "Skills" else "🏆"} {title} {"⚡️" if title == "Experience" else "🛠" if title == "Skills" else "🏆"}</div>', unsafe_allow_html=True)
    st.markdown(content, unsafe_allow_html=True)

def create_experience_item(job):
    
    return f"""
    <div class="experience-item">
        <h2><a href="{job["link"]}">{job["company"]}</a></h2>
            <p>{job['title']} </p>
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