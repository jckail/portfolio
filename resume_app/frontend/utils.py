import base64

def get_pdf_download_link(file_path):
    with open(file_path, "rb") as f:
        bytes = f.read()
        b64 = base64.b64encode(bytes).decode()
        href = f'data:application/pdf;base64,{b64}'
    return href

def add_script_for_download_and_navigation():
    return """
    <script>
    function downloadResume() {
        const link = document.createElement('a');
        link.href = '""" + get_pdf_download_link("resume_app/backend/assets/JordanKailResume.pdf") + """';
        link.download = 'JordanKailResume.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    let timeout;
    let lastScrollTop = 0;
    let isScrolling = false;

    function showNavigation() {
        const expander = document.querySelector('.streamlit-expanderHeader');
        if (expander) {
            expander.click();
        }
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (expander) {
                expander.click();
            }
            isScrolling = false;
        }, 3000);
    }

    function handleScroll() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (!isScrolling) {
            isScrolling = true;
            showNavigation();
        }
        
        const sections = ['experience', 'skills', 'achievements'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element.getBoundingClientRect().top <= window.innerHeight / 2) {
                document.querySelectorAll('.sidebar-nav a').forEach(link => {
                    link.style.color = '#ffffff';
                });
                document.querySelector(`.sidebar-nav a[href="#${section}"]`).style.color = '#00ff3c';
            }
        });
        
        lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
    }

    window.addEventListener('scroll', handleScroll);
    </script>
    """