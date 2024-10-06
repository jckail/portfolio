def add_script_for_download_and_navigation(api_url):
    return f"""
    <script>
    function downloadResume() {{
        fetch('{api_url}/download_resume')
            .then(response => response.blob())
            .then(blob => {{
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'JordanKailResume.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }})
            .catch(() => alert('An error occurred while downloading the resume.'));
    }}

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {{
        anchor.addEventListener('click', function (e) {{
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({{
                behavior: 'smooth'
            }});
        }});
    }});

    let lastScrollTop = 0;
    let isNavVisible = false;
    const scrollThreshold = 100;

    function toggleNavigation(show) {{
        const expander = document.querySelector('.streamlit-expanderHeader');
        if (expander) {{
            if (show && !isNavVisible) {{
                expander.click();
                isNavVisible = true;
            }} else if (!show && isNavVisible) {{
                expander.click();
                isNavVisible = false;
            }}
        }}
    }}

    function handleScroll() {{
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (!isNavVisible && currentScrollTop > lastScrollTop) {{
            toggleNavigation(true);
        }} else if (isNavVisible && Math.abs(currentScrollTop - lastScrollTop) > scrollThreshold) {{
            toggleNavigation(false);
        }}
        
        const sections = ['experience', 'skills', 'achievements'];
        sections.forEach(section => {{
            const element = document.getElementById(section);
            if (element.getBoundingClientRect().top <= window.innerHeight / 2) {{
                document.querySelectorAll('.sidebar-nav a').forEach(link => {{
                    link.style.color = '#ffffff';
                }});
                document.querySelector(`.sidebar-nav a[href="#${{section}}"]`).style.color = '#0403ff';
            }}
        }});
        
        lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
    }}

    window.addEventListener('scroll', handleScroll);
    </script>
    """