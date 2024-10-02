import streamlit as st

def create_header(name, contact):
    st.markdown(f"""
    <div class="header">
        <h1>{name}</h1>
        <p>
            📞 {contact['phone']} | 📧 <a href="mailto:{contact['email']}">{contact['email']}</a> | 📍 {contact['location']} | 🔗 <a href="{contact['github']}">GitHub</a>
        </p>
        <div class="nav-menu">
            <a href="#" onclick="downloadResume()">Download Resume</a>
        </div>
    </div>
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
        <h3>{job['company']} - {job['title']}</h3>
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