"""
This module contains a deduplicated and alphabetically sorted dictionary of skills for faster lookup.
Generated from the original skills.py file.
"""

# Initialize the skills dictionary with skills for faster lookup
skills = {
    "airbyte": {
        "display_name": "Airbyte",
        "image": "airbyte.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-integration", "etl", "data-pipeline"],
        "description": "An open-source data integration platform that syncs data from APIs, databases, and files to data warehouses, lakes, and other destinations.",
        "weblink": "https://airbyte.com/"
    },
    "airtable": {
        "display_name": "Airtable",
        "image": "airtable.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "collaboration", "low-code"],
        "description": "A low-code platform for building collaborative applications, combining the flexibility of a spreadsheet with the power of a database.",
        "weblink": "https://airtable.com/"
    },
    "amazon_bedrock": {
        "display_name": "Amazon Bedrock",
        "image": "arch_amazon_bedrock.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "aws"],
        "description": "Amazon's managed service providing access to foundational models for building generative AI applications.",
        "weblink": "https://aws.amazon.com/bedrock/"
    },
    "apache_airflow": {
        "display_name": "Apache Airflow",
        "image": "airflow.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["orchestration", "workflow", "data-pipeline"],
        "description": "A platform to programmatically author, schedule, and monitor workflows, often used for data pipeline orchestration.",
        "weblink": "https://airflow.apache.org/"
    },
    "apache_cassandra": {
        "display_name": "Apache Cassandra",
        "image": "apache_cassandra.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["database", "nosql", "distributed"],
        "description": "A highly-scalable, distributed NoSQL database designed to handle large amounts of data across multiple servers.",
        "weblink": "https://cassandra.apache.org/"
    },
    "apache_hadoop": {
        "display_name": "Apache Hadoop",
        "image": "apache_hadoop.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["big-data", "distributed-computing", "storage"],
        "description": "A framework for distributed storage and processing of large data sets using simple programming models.",
        "weblink": "https://hadoop.apache.org/"
    },
    "apache_iceberg": {
        "display_name": "Apache Iceberg",
        "image": "apache_iceberg.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-lake", "table-format", "analytics"],
        "description": "An open table format for huge analytic datasets, offering improved performance and reliability in data lakes.",
        "weblink": "https://iceberg.apache.org/"
    },
    "apache_kafka": {
        "display_name": "Apache Kafka",
        "image": "kafka.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["streaming", "messaging", "distributed-systems"],
        "description": "A distributed streaming platform capable of handling real-time data feeds with high throughput and low latency.",
        "weblink": "https://kafka.apache.org/"
    },
    "apache_pulsar": {
        "display_name": "Apache Pulsar",
        "image": "apachepulsar.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["streaming", "messaging", "pub-sub"],
        "description": "A cloud-native, distributed messaging and streaming platform built for high performance at scale.",
        "weblink": "https://pulsar.apache.org/"
    },
    "apache_rocketmq": {
        "display_name": "Apache RocketMQ",
        "image": "apacherocketmq.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["messaging", "queue", "pub-sub"],
        "description": "A distributed messaging and streaming platform with low latency, high performance, and reliability.",
        "weblink": "https://rocketmq.apache.org/"
    },
    "apache_spark": {
        "display_name": "Apache Spark",
        "image": "apache_spark.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["processing", "big-data", "analytics"],
        "description": "A unified analytics engine for large-scale data processing, supporting SQL, streaming, ML, and graph processing.",
        "weblink": "https://spark.apache.org/"
    },
    "automl": {
        "display_name": "AutoML",
        "image": "automl.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "ml", "automation"],
        "description": "Automated machine learning tools that optimize the selection, composition, and parameterization of ML models.",
        "weblink": "https://cloud.google.com/automl"
    },
    "aws": {
        "display_name": "AWS",
        "image": "aws.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["cloud", "infrastructure", "services"],
        "description": "Amazon's comprehensive cloud computing platform offering a wide range of infrastructure and application services.",
        "weblink": "https://aws.amazon.com/"
    },
    "bigquery": {
        "display_name": "BigQuery",
        "image": "bigquery.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["data-warehouse", "analytics", "google-cloud"],
        "description": "Google's fully managed, serverless data warehouse that enables scalable analysis over petabytes of data.",
        "weblink": "https://cloud.google.com/bigquery"
    },
    "chroma": {
        "display_name": "Chroma",
        "image": "chroma.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["vector-db", "embeddings", "rag"],
        "description": "An open-source embedding database for building AI applications with vector search capabilities.",
        "weblink": "https://www.trychroma.com/"
    },
    "claude_ai": {
        "display_name": "Claude AI",
        "image": "claude_ai.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "anthropic"],
        "description": "An AI assistant created by Anthropic, known for its advanced natural language processing capabilities.",
        "weblink": "https://www.anthropic.com/claude"
    },
    "cloud_composer": {
        "display_name": "Cloud Composer",
        "image": "cloud_composer.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["orchestration", "google-cloud", "airflow"],
        "description": "Google Cloud's fully managed workflow orchestration service built on Apache Airflow.",
        "weblink": "https://cloud.google.com/composer"
    },
    "cloud_data_fusion": {
        "display_name": "Cloud Data Fusion",
        "image": "cloud_data_fusion.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-integration", "etl", "google-cloud"],
        "description": "A fully managed, cloud-native data integration service for building and managing ETL/ELT data pipelines.",
        "weblink": "https://cloud.google.com/data-fusion"
    },
    "cockroachdb": {
        "display_name": "CockroachDB",
        "image": "cockroachdb.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["database", "distributed", "sql"],
        "description": "A distributed SQL database designed for global scale, consistency, and survival.",
        "weblink": "https://www.cockroachlabs.com/"
    },
    "couchdb": {
        "display_name": "CouchDB",
        "image": "couchdb.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "nosql", "document"],
        "description": "A document-oriented NoSQL database that uses JSON for documents and JavaScript for MapReduce queries.",
        "weblink": "https://couchdb.apache.org/"
    },
    "css3": {
        "display_name": "CSS3",
        "image": "css3.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["frontend", "styling", "web"],
        "description": "The latest evolution of the Cascading Style Sheets language, used for describing the presentation of web documents.",
        "weblink": "https://www.w3.org/Style/CSS/"
    },
    "databricks": {
        "display_name": "Databricks",
        "image": "databricks.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["data-platform", "analytics", "spark"],
        "description": "A unified analytics platform built around Apache Spark for big data processing and machine learning.",
        "weblink": "https://www.databricks.com/"
    },
    "datadog": {
        "display_name": "Datadog",
        "image": "datadog.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["monitoring", "observability", "devops"],
        "description": "A monitoring and analytics platform for large-scale applications, providing full-stack observability.",
        "weblink": "https://www.datadoghq.com/"
    },
    "dataprep": {
        "display_name": "Dataprep",
        "image": "dataprep.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-preparation", "etl", "cleaning"],
        "description": "An intelligent data service for visually exploring, cleaning, and preparing data for analysis.",
        "weblink": "https://cloud.google.com/dataprep"
    },
    "dataproc": {
        "display_name": "Dataproc",
        "image": "dataproc.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["data-processing", "google-cloud", "spark"],
        "description": "A fully managed cloud service for running Apache Spark and Hadoop clusters.",
        "weblink": "https://cloud.google.com/dataproc"
    },
    "dbt": {
        "display_name": "DBT",
        "image": "dbt.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["data-transformation", "analytics", "sql"],
        "description": "A command-line tool that enables analytics engineers to transform data in their warehouses using SQL.",
        "weblink": "https://www.getdbt.com/"
    },
    "django": {
        "display_name": "Django",
        "image": "django.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["backend", "framework", "python"],
        "description": "A high-level Python web framework that encourages rapid development and clean, pragmatic design.",
        "weblink": "https://www.djangoproject.com/"
    },
    "docker": {
        "display_name": "Docker",
        "image": "docker.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["infrastructure", "containerization", "devops"],
        "description": "A platform for developing, shipping, and running applications in containers.",
        "weblink": "https://www.docker.com/"
    },
    "duckdb": {
        "display_name": "DuckDB",
        "image": "duckdb.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["database", "analytics", "embedded"],
        "description": "An embedded analytical database system, like SQLite for analytics.",
        "weblink": "https://duckdb.org/"
    },
    "dynamodb": {
        "display_name": "DynamoDB",
        "image": "dynamodb.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["database", "nosql", "aws"],
        "description": "AWS's fully managed NoSQL database service designed for high-performance applications at scale.",
        "weblink": "https://aws.amazon.com/dynamodb/"
    },
    "elasticsearch": {
        "display_name": "Elasticsearch",
        "image": "elastic_search.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["database", "search", "analytics"],
        "description": "A distributed, RESTful search and analytics engine capable of addressing a growing number of use cases.",
        "weblink": "https://www.elastic.co/"
    },
    "fastapi": {
        "display_name": "FastAPI",
        "image": "fastapi.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["backend", "framework", "python"],
        "description": "A modern, fast web framework for building APIs with Python based on standard Python type hints.",
        "weblink": "https://fastapi.tiangolo.com/"
    },
    "figma": {
        "display_name": "Figma",
        "image": "figma.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["design", "ui-ux", "collaboration"],
        "description": "A collaborative interface design tool that supports real-time team collaboration.",
        "weblink": "https://www.figma.com/"
    },
    "firestore": {
        "display_name": "Firestore",
        "image": "firestore.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "nosql", "firebase"],
        "description": "A flexible, scalable NoSQL cloud database for mobile, web, and server development.",
        "weblink": "https://firebase.google.com/products/firestore"
    },
    "flask": {
        "display_name": "Flask",
        "image": "flask.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["backend", "framework", "python"],
        "description": "A lightweight WSGI web application framework in Python, known for its flexibility and simplicity.",
        "weblink": "https://flask.palletsprojects.com/"
    },
    "flink": {
        "display_name": "Flink",
        "image": "flink.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["streaming", "processing", "big-data"],
        "description": "A stream processing framework for distributed, high-performing, always-available, and accurate data streaming applications.",
        "weblink": "https://flink.apache.org/"
    },
    "gin": {
        "display_name": "Gin",
        "image": "gin_go.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["backend", "framework", "go"],
        "description": "A high-performance HTTP web framework written in Go (Golang), known for its speed and middleware support.",
        "weblink": "https://gin-gonic.com/"
    },
    "git": {
        "display_name": "Git",
        "image": "git.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["version-control", "development", "collaboration"],
        "description": "A distributed version control system for tracking changes in source code during software development.",
        "weblink": "https://git-scm.com/"
    },
    "github_actions": {
        "display_name": "GitHub Actions",
        "image": "github_actions.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["ci-cd", "automation", "devops"],
        "description": "GitHub's built-in continuous integration and continuous delivery (CI/CD) platform.",
        "weblink": "https://github.com/features/actions"
    },
    "go": {
        "display_name": "Go",
        "image": "golang.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["language", "general-purpose"],
        "description": "An open source programming language designed for building simple, reliable, and efficient software.",
        "weblink": "https://golang.org/"
    },
    "google_app_engine": {
        "display_name": "Google App Engine",
        "image": "app_engine.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["paas", "google-cloud", "serverless"],
        "description": "A platform-as-a-service for building scalable web applications and backend services.",
        "weblink": "https://cloud.google.com/appengine"
    },
    "google_cloud": {
        "display_name": "Google Cloud",
        "image": "google_cloud.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["cloud", "infrastructure", "services"],
        "description": "Google's suite of cloud computing services, offering infrastructure and platform services.",
        "weblink": "https://cloud.google.com/"
    },
    "google_gemini": {
        "display_name": "Google Gemini",
        "image": "google_gemini.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "google"],
        "description": "Google's most capable and flexible AI model, designed to handle text, code, images, and other modalities.",
        "weblink": "https://deepmind.google/technologies/gemini/"
    },
    "grafana": {
        "display_name": "Grafana",
        "image": "grafana.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["monitoring", "visualization", "observability"],
        "description": "An open-source platform for monitoring and observability, supporting various data sources for metrics visualization.",
        "weblink": "https://grafana.com/"
    },
    "graphql": {
        "display_name": "GraphQL",
        "image": "graphql.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["api", "query-language", "web"],
        "description": "A query language for APIs and a runtime for fulfilling those queries with existing data.",
        "weblink": "https://graphql.org/"
    },
    "html5": {
        "display_name": "HTML5",
        "image": "html5.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["frontend", "markup", "web"],
        "description": "The latest version of the standard markup language for documents designed to be displayed in web browsers.",
        "weblink": "https://html.spec.whatwg.org/"
    },
    "hugging_face": {
        "display_name": "Hugging Face",
        "image": "huggingface.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "ml", "nlp"],
        "description": "A platform providing tools for building, training and deploying state-of-the-art machine learning models.",
        "weblink": "https://huggingface.co/"
    },
    "jaeger": {
        "display_name": "Jaeger",
        "image": "jaeger_tracing.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["tracing", "observability", "monitoring"],
        "description": "An open-source distributed tracing system for monitoring and troubleshooting microservices.",
        "weblink": "https://www.jaegertracing.io/"
    },
    "java": {
        "display_name": "Java",
        "image": "java.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["language", "general-purpose"],
        "description": "A class-based, object-oriented programming language designed for portability and cross-platform development.",
        "weblink": "https://www.java.com/"
    },
    "javascript": {
        "display_name": "JavaScript",
        "image": "javascript.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["language", "web", "frontend"],
        "description": "A programming language that enables interactive web pages and is an essential part of web applications.",
        "weblink": "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
    },
    "jupyter": {
        "display_name": "Jupyter",
        "image": "jupyter.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["development", "data-science", "interactive"],
        "description": "An open-source project enabling interactive computing and visualization across multiple programming languages.",
        "weblink": "https://jupyter.org/"
    },
    "keras": {
        "display_name": "Keras",
        "image": "keras.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["ai", "ml", "deep-learning"],
        "description": "A high-level neural network library that runs on top of TensorFlow, designed for easy and fast deep learning.",
        "weblink": "https://keras.io/"
    },
    "kinesis_firehose": {
        "display_name": "Kinesis Firehose",
        "image": "kinesis_firehose.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["streaming", "aws", "data-delivery"],
        "description": "An AWS service that reliably loads streaming data into data lakes, warehouses, and analytics services.",
        "weblink": "https://aws.amazon.com/kinesis/data-firehose/"
    },
    "kubernetes": {
        "display_name": "Kubernetes",
        "image": "kubernetes.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["infrastructure", "orchestration", "devops"],
        "description": "An open-source container orchestration platform for automating deployment, scaling, and management of applications.",
        "weblink": "https://kubernetes.io/"
    },
    "langchain": {
        "display_name": "LangChain",
        "image": "langchain.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "framework"],
        "description": "A framework for developing applications powered by language models, focusing on composability and integration.",
        "weblink": "https://www.langchain.com/"
    },
    "llamaindex": {
        "display_name": "LlamaIndex",
        "image": "llamaindex.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "rag"],
        "description": "A data framework for building LLM applications, focusing on context augmentation and retrieval.",
        "weblink": "https://www.llamaindex.ai/"
    },
    "looker": {
        "display_name": "Looker",
        "image": "looker.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["bi", "analytics", "visualization"],
        "description": "A business intelligence and big data analytics platform that helps explore, analyze and share data insights.",
        "weblink": "https://www.looker.com/"
    },
    "material_ui": {
        "display_name": "Material UI",
        "image": "material_ui.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["frontend", "ui-framework", "react"],
        "description": "A popular React UI framework implementing Google's Material Design principles.",
        "weblink": "https://mui.com/"
    },
    "milvus": {
        "display_name": "Milvus",
        "image": "milvus_black.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["vector-db", "similarity-search", "ai"],
        "description": "An open-source vector database built for scalable similarity search and AI applications.",
        "weblink": "https://milvus.io/"
    },
    "mistral_ai": {
        "display_name": "Mistral AI",
        "image": "mistral_ai.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "open-source"],
        "description": "A company developing state-of-the-art open-source large language models and AI solutions.",
        "weblink": "https://mistral.ai/"
    },
    "mongodb": {
        "display_name": "MongoDB",
        "image": "mongodb.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["database", "nosql", "document-store"],
        "description": "A document-oriented NoSQL database used for high volume data storage and processing.",
        "weblink": "https://www.mongodb.com/"
    },
    "mysql": {
        "display_name": "MySQL",
        "image": "mysql.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["database", "relational", "sql"],
        "description": "An open-source relational database management system using SQL for data manipulation.",
        "weblink": "https://www.mysql.com/"
    },
    "neo4j": {
        "display_name": "Neo4j",
        "image": "neo4j.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["database", "graph", "nosql"],
        "description": "A native graph database platform optimized for capturing, analyzing, and traversing connected data.",
        "weblink": "https://neo4j.com/"
    },
    "nginx": {
        "display_name": "NGINX",
        "image": "nginx.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["web-server", "proxy", "load-balancer"],
        "description": "A web server that can also be used as a reverse proxy, load balancer, and HTTP cache.",
        "weblink": "https://www.nginx.com/"
    },
    "nodejs": {
        "display_name": "Node.js",
        "image": "node.js.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["backend", "runtime", "javascript"],
        "description": "A JavaScript runtime built on Chrome's V8 JavaScript engine for building scalable network applications.",
        "weblink": "https://nodejs.org/"
    },
    "numpy": {
        "display_name": "NumPy",
        "image": "numpy.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["scientific-computing", "python", "array"],
        "description": "A fundamental package for scientific computing in Python, providing support for large arrays and matrices.",
        "weblink": "https://numpy.org/"
    },
    "openai": {
        "display_name": "OpenAI",
        "image": "openai.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "llm", "cloud-service"],
        "description": "A company developing advanced AI models and APIs for natural language processing and generation.",
        "weblink": "https://openai.com/"
    },
    "opentelemetry": {
        "display_name": "OpenTelemetry",
        "image": "opentelemetry.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["observability", "tracing", "metrics"],
        "description": "A collection of tools, APIs, and SDKs for instrumenting, generating, collecting, and exporting telemetry data.",
        "weblink": "https://opentelemetry.io/"
    },
    "pandas": {
        "display_name": "Pandas",
        "image": "pandas.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["data-analysis", "python", "dataframe"],
        "description": "A fast, powerful, and flexible data analysis library for Python, providing high-performance data structures.",
        "weblink": "https://pandas.pydata.org/"
    },
    "php": {
        "display_name": "PHP",
        "image": "php.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["language", "web", "backend"],
        "description": "A popular general-purpose scripting language especially suited for web development.",
        "weblink": "https://www.php.net/"
    },
    "pinecone": {
        "display_name": "Pinecone",
        "image": "pinecone.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["vector-db", "similarity-search", "ai"],
        "description": "A fully managed vector database for building high-performance vector search applications.",
        "weblink": "https://www.pinecone.io/"
    },
"playwright": {
        "display_name": "Playwright",
        "image": "playwrite.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["testing", "automation", "web"],
        "description": "A framework for web testing and automation, supporting multiple browser engines.",
        "weblink": "https://playwright.dev/"
    },
    "postgresql": {
        "display_name": "PostgreSQL",
        "image": "postgresql.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["database", "relational", "sql"],
        "description": "A powerful, open-source object-relational database system with a strong reputation for reliability and features.",
        "weblink": "https://www.postgresql.org/"
    },
    "prefect": {
        "display_name": "Prefect",
        "image": "prefect.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["workflow", "orchestration", "data-pipeline"],
        "description": "A modern workflow orchestration tool for building, scheduling, and monitoring data pipelines.",
        "weblink": "https://www.prefect.io/"
    },
    "presto": {
        "display_name": "Presto",
        "image": "presto.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["query-engine", "big-data", "sql"],
        "description": "A distributed SQL query engine optimized for ad-hoc analysis of data at massive scale.",
        "weblink": "https://prestodb.io/"
    },
    "prometheus": {
        "display_name": "Prometheus",
        "image": "prometheus.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["monitoring", "metrics", "alerting"],
        "description": "An open-source monitoring and alerting toolkit designed for reliability and scalability.",
        "weblink": "https://prometheus.io/"
    },
    "pubsub": {
        "display_name": "PubSub",
        "image": "pubsub.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["messaging", "google-cloud", "pub-sub"],
        "description": "Google Cloud's real-time messaging service for streaming analytics and event-driven computing.",
        "weblink": "https://cloud.google.com/pubsub"
    },
    "python": {
        "display_name": "Python",
        "image": "python.svg",
        "professional_experience": True,
        "years_of_experience": 15,
        "tags": ["language", "general-purpose", "scripting"],
        "description": "A versatile programming language emphasizing code readability with an extensive ecosystem of libraries.",
        "weblink": "https://www.python.org/"
    },
    "pytorch": {
        "display_name": "PyTorch",
        "image": "pytorch.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["ai", "ml", "deep-learning"],
        "description": "An open source machine learning framework that accelerates the path from research to production.",
        "weblink": "https://pytorch.org/"
    },
    "quadrant": {
        "display_name": "Quadrant",
        "image": "quadrant.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["vector-db", "similarity-search", "ai"],
        "description": "A platform for vector similarity search and machine learning operations.",
        "weblink": "https://quadrant.ai/"
    },
    "rabbitmq": {
        "display_name": "RabbitMQ",
        "image": "rabbitmq.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["messaging", "queue", "broker"],
        "description": "A message broker that supports multiple messaging protocols and streaming patterns.",
        "weblink": "https://www.rabbitmq.com/"
    },
    "rds": {
        "display_name": "RDS",
        "image": "rds.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["database", "aws", "managed"],
        "description": "Amazon's Relational Database Service offering easy setup, operation, and scaling of databases in the cloud.",
        "weblink": "https://aws.amazon.com/rds/"
    },
    "react": {
        "display_name": "React",
        "image": "react.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["frontend", "framework", "javascript"],
        "description": "A JavaScript library for building user interfaces, particularly single-page applications.",
        "weblink": "https://reactjs.org/"
    },
    "redis": {
        "display_name": "Redis",
        "image": "redis.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["database", "cache", "in-memory"],
        "description": "An open-source, in-memory data structure store used as a database, cache, and message broker.",
        "weblink": "https://redis.io/"
    },
    "redux": {
        "display_name": "Redux",
        "image": "redux.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["frontend", "state-management", "react"],
        "description": "A predictable state container for JavaScript apps, often used with React.",
        "weblink": "https://redux.js.org/"
    },
    "retool": {
        "display_name": "Retool",
        "image": "retool.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["internal-tools", "low-code", "development"],
        "description": "A platform for building internal tools quickly using a visual interface and custom code.",
        "weblink": "https://retool.com/"
    },
    "rocksdb": {
        "display_name": "RocksDB",
        "image": "rocksdb.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "embedded", "key-value"],
        "description": "A high-performance embedded database for key-value data, optimized for fast storage.",
        "weblink": "https://rocksdb.org/"
    },
    "rust": {
        "display_name": "Rust",
        "image": "rust.svg",
        "professional_experience": False,
        "years_of_experience": 2,
        "tags": ["language", "systems"],
        "description": "A systems programming language focused on safety, concurrency, and performance.",
        "weblink": "https://www.rust-lang.org/"
    },
    "scala": {
        "display_name": "Scala",
        "image": "scala.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["language", "functional", "big-data"],
        "description": "A programming language combining object-oriented and functional programming, running on the JVM.",
        "weblink": "https://www.scala-lang.org/"
    },
    "scikit_learn": {
        "display_name": "Scikit-learn",
        "image": "scikit_learn.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["ml", "python", "data-science"],
        "description": "A machine learning library for Python, featuring various classification, regression and clustering algorithms.",
        "weblink": "https://scikit-learn.org/"
    },
    "snowflake": {
        "display_name": "Snowflake",
        "image": "snowflake.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["data-warehouse", "cloud", "analytics"],
        "description": "A cloud-based data warehousing platform offering storage and analytics solutions.",
        "weblink": "https://www.snowflake.com/"
    },
    "socketio": {
        "display_name": "Socket.io",
        "image": "socketdotio.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["realtime", "websockets", "networking"],
        "description": "A library enabling real-time, bidirectional and event-based communication between web clients and servers.",
        "weblink": "https://socket.io/"
    },
    "splunk": {
        "display_name": "Splunk",
        "image": "splunk.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["monitoring", "logging", "analytics"],
        "description": "A platform for searching, monitoring, and analyzing machine-generated big data via a web-style interface.",
        "weblink": "https://www.splunk.com/"
    },
    "sql": {
        "display_name": "SQL",
        "image": "sql.svg",
        "professional_experience": True,
        "years_of_experience": 15,
        "tags": ["language", "database", "query"],
        "description": "A standard language for storing, manipulating and retrieving data in relational databases.",
        "weblink": "https://www.iso.org/standard/63555.html"
    },
    "sqlalchemy": {
        "display_name": "SQLAlchemy",
        "image": "sqlalchemy.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["backend", "orm", "python"],
        "description": "A SQL toolkit and Object-Relational Mapping (ORM) library for Python.",
        "weblink": "https://www.sqlalchemy.org/"
    },
    "streamlit": {
        "display_name": "Streamlit",
        "image": "streamlit.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["visualization", "python", "dashboard"],
        "description": "An open-source app framework for Machine Learning and Data Science teams to create web apps quickly.",
        "weblink": "https://streamlit.io/"
    },
    "supabase": {
        "display_name": "Supabase",
        "image": "supabase_logo.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["backend", "database", "authentication"],
        "description": "An open-source alternative to Firebase, providing a PostgreSQL database, authentication, and real-time subscriptions.",
        "weblink": "https://supabase.com/"
    },
    "svelte": {
        "display_name": "Svelte",
        "image": "svelte.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["frontend", "framework", "javascript"],
        "description": "A radical new approach to building user interfaces, compiling components to highly efficient vanilla JavaScript.",
        "weblink": "https://svelte.dev/"
    },
    "tableau": {
        "display_name": "Tableau",
        "image": "tableau_software.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["visualization", "bi", "analytics"],
        "description": "A visual analytics platform helping people see and understand their data.",
        "weblink": "https://www.tableau.com/"
    },
    "tailwind_css": {
        "display_name": "Tailwind CSS",
        "image": "tailwind_css.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["css", "frontend", "styling"],
        "description": "A utility-first CSS framework for rapidly building custom user interfaces.",
        "weblink": "https://tailwindcss.com/"
    },
    "tensorflow": {
        "display_name": "TensorFlow",
        "image": "tensorflow.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["ai", "ml", "deep-learning"],
        "description": "An end-to-end open-source platform for machine learning, offering comprehensive tools and libraries.",
        "weblink": "https://www.tensorflow.org/"
    },
    "terraform": {
        "display_name": "Terraform",
        "image": "hashicorp_terraform.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["infrastructure", "iac", "devops"],
        "description": "An infrastructure as code tool for building, changing, and versioning infrastructure safely and efficiently.",
        "weblink": "https://www.terraform.io/"
    },
    "timescaledb": {
        "display_name": "TimescaleDB",
        "image": "timescale.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["database", "timeseries", "postgresql"],
        "description": "An open-source database designed to make SQL scalable for time-series data.",
        "weblink": "https://www.timescale.com/"
    },
    "trino": {
        "display_name": "Trino",
        "image": "trino.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["query-engine", "sql", "big-data"],
        "description": "A distributed SQL query engine designed to query large data sets distributed over multiple heterogeneous data sources.",
        "weblink": "https://trino.io/"
    },
    "trpc": {
        "display_name": "tRPC",
        "image": "trpc.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["backend", "api", "typescript"],
        "description": "An end-to-end typesafe API layer for full-stack TypeScript applications.",
        "weblink": "https://trpc.io/"
    },
    "typescript": {
        "display_name": "TypeScript",
        "image": "typescript.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["language", "javascript", "static-typing"],
        "description": "A typed superset of JavaScript that compiles to plain JavaScript, adding optional static types.",
        "weblink": "https://www.typescriptlang.org/"
    },
    "vertex_ai": {
        "display_name": "Vertex AI",
        "image": "vertexai.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "ml", "google-cloud"],
        "description": "Google Cloud's unified platform for building, deploying, and scaling ML models and AI applications.",
        "weblink": "https://cloud.google.com/vertex-ai"
    },
    "vite": {
        "display_name": "Vite",
        "image": "vite.js.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["build-tool", "frontend", "development"],
        "description": "A modern frontend build tool offering a faster and leaner development experience.",
        "weblink": "https://vitejs.dev/"
    },
"webassembly": {
        "display_name": "WebAssembly",
        "image": "webassembly.svg",
        "professional_experience": False,
        "years_of_experience": 1,
        "tags": ["web", "performance", "low-level"],
        "description": "A binary instruction format for stack-based virtual machines, designed as a low-level target for high-level languages on the web.",
        "weblink": "https://webassembly.org/"
    }
}