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
                    <li><a href="#skills">🛠 Technical Skills</a></li>
                    <li><a href="#projects">🏆 Projects</a></li>
                </ul>
            </nav>
            """, unsafe_allow_html=True)
        with st.sidebar.expander("ℹ️ Contact", expanded=True):  # Sidebar starts collapsed
            st.markdown(f"""
            <nav class="sidebar-nav">
                                        <p>
                     📍 {contact['location']} 
                </p>
                <p>
                    📞 {contact['phone']} 
                </p>
                                <p>
                     <a href="mailto:{contact['email']}"> 📧 {contact['email']}</a> 
                </p>
                <p>Open To:</p>
                <ul>
                    <li>Relocation</li>
                    <li>Working Remote</li>
                    <li>Working In Office</li>
                    <li>Full time Travel</li>
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
                <a class="link-container" href="{contact['github']}" target="_blank">🤖 GitHub</a>
                <a class="link-container" href="{contact['linkedin']}" target="_blank">👔 LinkedIn</a>
                {download_button}
            </div>
            """, unsafe_allow_html=True)
        
    
    
    with col3:
        st.toggle(theme_icon, value=theme_value, key="theme_toggle", on_change=toggle_theme)



def create_section(title, content):
    st.markdown(f'<div class="section-marker" id="{title.lower()}">{"⚡️" if title == "Experience" else "🛠" if title == "Technical Skills" else "🏆"} {title} {"⚡️" if title == "Experience" else "🛠" if title == "Technical Skills" else "🏆"}</div>', unsafe_allow_html=True)
    st.markdown(content, unsafe_allow_html=True)

def create_experience_item(job):
    
    return f"""
    <div class="experience-item">
        <h2><a href="{job["link"]}" target="_blank">{job["company"]}</a></h2>
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
        content += f'<div class="experience-item">'
        content += f"<h2>{category}</h2>"
        content += f'<p>{", ".join(skill_list)}</p>'
        content += "<br><br>"
        content += "</div>"
    return content

def create_projects_section(projects):
    content = ""
    for project in projects:
        content += f'<div class="experience-item">'
        content += f'<h2><a href="{project["link"]}" target="_blank">{project["title"]}</a></h2>'
        if project.get('link2'):
            content += f'<p><a href="{project["link2"]}" target="_blank">See in Action</a></p>'
        content += f"<p>{project['description']}</p>"
        content += "</div>"
    return content