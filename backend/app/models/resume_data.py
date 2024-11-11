resume_data = {
    "name": "Jordan Kail",
    "title": "Data Engineer",
    "contact": {
        "email": "jckail13@gmail.com",
        "phone": "571-218-5000",
        "website": "https://jordan-kail.com/",
        "location": "Denver, CO",
        "github": "https://github.com/jckail",
        "linkedin": "https://www.linkedin.com/in/jckail/",
    },
    "about_me": str("""
I'm a data engineer with a deep curiosity for technology, always excited to explore AI, machine learning, and data systems. I've helped build efficient, scalable systems, developed complex pipelines, and worked with transformer models.

I love collaborating with others to create technology that makes a real impact. When I'm not working, you'll likely find me building computers, hiking with my dog in the mountains, or experimenting with new machine learning tools.

For me, the goal is simple:
"Make the world work better, one dataset—and adventure—at a time."

"""),
    "experience": [
        {
            "company": "Prove Identity",
            "title": "Staff Data Engineer",
            "date": "06/2023 - Present",
            "location": "Denver, CO",
            "highlights": [
                "Spearheading company-wide refactor from on-prem Java + Oracle to cloud-based Go + Postgres, reducing core product API response time to 120ms and operational expenses by 95%.",
                "Built AI-driven Retrieval-Augmented Generation (RAG) chatbots with Airflow, LangChain, and OpenAI, automating 150+ human-hours weekly.",
                "Deployed an event-driven data streaming platform using Go, Flink, and Kafka, migrating 1,200+ batch jobs to real-time processing, enhancing data availability from days to minutes.",
            ],
            "link": "https://www.prove.com/",
            "logoPath": "/images/companylogos/prove.svg"
        },
        {
            "company": "Meta (Facebook)",
            "title": "Senior Data Engineer",
            "date": "01/2021 - 09/2022",
            "location": "Seattle, WA + Menlo Park, CA + Remote, USA",
            "highlights": [
                "Led data engineering efforts for Facebook Public Groups and Community Chats, managing a team of 10+ engineers.",
                "Developed and deployed 100+ ML pipelines with Airflow, Spark, and PyTorch, leveraging NLP, computer vision, and user segmentation to optimize ad targeting and notifications for billions of users.",
                "Designed an automated framework to dynamically generate thousands of async Spark data pipelines, increasing compute efficiency by 66%.",
                "Re-architected petabyte-scale data models, reducing storage costs by 25%.",
            ],
            "link": "https://about.fb.com/",
            "logoPath": "/images/companylogos/meta.svg"
        },
        {
            "company": "Deloitte",
            "title": "Consultant - AI & Advanced Analytics",
            "date": "12/2018 - 12/2020",
            "location": "Atlanta, GA + Menlo Park, CA",
            "highlights": [
                "Automated approximately 31% of human processed healthcare claims using transformer machine learning models, saving 250,000+ hours annually.",
                "Optimized exabyte-scale video reliability metrics, reducing daily processing time by 90% while expanding metric coverage.",
                "Led 20+ consultants on Fortune 50 engagements, translating client needs into actionable requirements and ensuring timely delivery of technical solutions.",
            ],
            "link": "https://www2.deloitte.com/ch/en/pages/strategy-operations/solutions/analytics-and-cognitive.html",
            "logoPath": "/images/companylogos/deloitte.svg"
        },
        {
            "company": "Wide Open West",
            "title": "Lead Data Scientist",
            "date": "11/2017 - 12/2018",
            "location": "Denver, CO",
            "highlights": [
                "Built Machine Learning applications using custom classification and churn models, driving a 22% YoY increase in customer package upgrades.",
                "Led a team of 5 data practitioners, providing BI and data insights to sales, product, and engineering teams company-wide.",
            ],
            "link": "https://www.wowway.com/",
            "logoPath": "/images/companylogos/wow.svg"
        },
        {
            "company": "Common Spirit Health (Formerly CHI)",
            "title": "Data Engineer - Business Intelligence",
            "date": "09/2016 - 11/2017",
            "location": "Denver, CO",
            "highlights": [
                "Architected and delivered new rest APIs and data lakes, improving data processing time for external partner data products from 7 days to 5 minutes."
            ],
            "link": "https://www.commonspirit.org/",
            "logoPath": "/images/companylogos/commonspirit.svg"
        },
        {
            "company": "AcuStream (Acquired by R1 RCM)",
            "title": "Software Engineer - Data",
            "date": "04/2013 - 09/2016",
            "location": "Boulder, CO",
            "highlights": [
                "Built a custom invoicing system leveraging rule-based algorithms and machine learning, driving over $300M in annual recurring revenue."
            ],
            "link": "https://www.r1rcm.com/",
            "logoPath": "/images/companylogos/r1.svg"
        },
    ],
    "skills": {
        "Programming": [
            "Python",
            "SQL",
            "GO",
            "JavaScript",
            "Rust",
            "PHP",
            "Java",
            "Scala",
        ],
        "Big Data": [
            "Airflow",
            "Kafka",
            "Spark",
            "ProtoBuff",
            "Flink",
            "DBT",
            "Snowflake",
            "Databricks",
            "Iceberg",
            "NoSQL",
            "Neo4J",
            "Redis",
            "MongoDB",
            "PostgreSQL",
            "Tableau",
            "ReDash",
            "Streamlit",
        ],
        "AI & ML": [
            "OpenAI",
            "LangChain",
            "Llama.cpp",
            "Ollama",
            "Llama Index",
            "Pytorch",
            "TensorFlow",
            "Hugging Face",
            "Vector Databases",
            "Embeddings",
            "Agents",
            "CuPy",
            "Keras",
            "Caffe",
            "Scikit-Learn",
        ],
        "Amazon Web Services (AWS)": [
            "EMR",
            "SageMaker",
            "S3",
            "Redshift",
            "Glue",
            "MWAA",
            "RDS",
            "Kinesis",
            "Firehose",
            "DynamoDB",
            "Bedrock",
            "SNS",
        ],
        "Google Cloud Platform (GCP)": [
            "BigQuery",
            "Compute Engine",
            "Dataflow",
            "AutoML",
            "Vertex AI Studio",
            "PubSub",
            "Cloud Run",
            "Looker",
            "Firebase",
        ],
        "Web Development": [
            "Docker",
            "Kubernetes",
            "FastAPI",
            "Flask",
            "Django",
            "Svelte",
            "React",
            "Node.js",
            "HTML",
            "GraphQL",
            "Gin",
            "Retool",
        ],
    },
    "projects": [
        {
            "title": 'TechCrunch - "Join Group via QR"',
            "description": "Created the ability for Facebook group admins to invite users to their groups by generating a QR Code. Used by millions daily.",
            "link": "https://techcrunch.com/2022/03/09/facebook-rolls-out-new-tools-for-group-admins-to-manage-their-communities-and-reduce-misinformation/",
        },
        {
            "title": "AI Agent Job Matching - Jobbr",
            "description": "Created a custom AI agent that matches a resume to available jobs at tech companies. Using Python, Langchain, FastAPI and OpenAI.",
            "link": "https://github.com/jckail/Jobbr",
        },
        {
            "title": 'Loyalty Management App - Pointup.io',
            "description": 'An AI web app for "All of your loyalty points in one place," powered by a Selenium-WebDriver agent in AWS via elastic beanstalk, lambda, and s3. ',
            "link": "https://github.com/jckail/point_bot",
            "link2": "https://www.pointup.io/"
        },
        {
            "title": "Algorithmic Crypto Trading Project",
            "description": "Created crypto trading algorithm via scraped crypto, NASDAQ, and CPME rare minerals data. Made with Flask, Pandas, AWS, and SageMaker.",
            "link": "https://github.com/jckail/crypto_trader",
        },
        {
            "title": "AI Developer Assistant - goPilot",
            "description": "A custom AI CLI tool to help debug, develop, and compile apps written in GO. ",
            "link": "https://github.com/jckail/goPilot",
        },
        {
            "title": "Data Playground - A Shop Like App",
            "description": "A website designed to produce data to test data pipelines and ETL processes. Made with FastAPI, Streamlit, and Docker.",
            "link": "https://github.com/jckail/shop_project",
        },
        {
            "title": "Personal Portfolio Website",
            "description": "A fully custom website using FastAPI and Streamlit. Why Streamlit? Simply because I wanted to learn a new technology. Hosted in GCP via CloudRun.",
            "link": "https://github.com/jckail/portfolio",
        },
    ],
}
