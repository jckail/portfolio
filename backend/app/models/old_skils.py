"""
This module contains a deduplicated and alphabetically sorted dictionary of skills for faster lookup.
Generated from the original skills.py file.
"""

# Initialize the skills dictionary with skills for faster lookup
skills = [
    {
        "name": "Airbyte",
        "image": "airbyte.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-integration", "etl", "data-pipeline"]
    },
    {
        "name": "Airtable",
        "image": "airtable.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "collaboration", "low-code"]
    },
    {
        "name": "Amazon Bedrock",
        "image": "arch_amazon_bedrock.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "aws"]
    },
    {
        "name": "Apache Airflow",
        "image": "airflow.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["orchestration", "workflow", "data-pipeline"]
    },
    {
        "name": "Apache Cassandra",
        "image": "apache_cassandra.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["database", "nosql", "distributed"]
    },
    {
        "name": "Apache Hadoop",
        "image": "apache_hadoop.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["big-data", "distributed-computing", "storage"]
    },
    {
        "name": "Apache Iceberg",
        "image": "apache_iceberg.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-lake", "table-format", "analytics"]
    },
    {
        "name": "Apache Kafka",
        "image": "kafka.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["streaming", "messaging", "distributed-systems"]
    },
    {
        "name": "Apache Pulsar",
        "image": "apachepulsar.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["streaming", "messaging", "pub-sub"]
    },
    {
        "name": "Apache RocketMQ",
        "image": "apacherocketmq.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["messaging", "queue", "pub-sub"]
    },
    {
        "name": "Apache Spark",
        "image": "apache_spark.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["processing", "big-data", "analytics"]
    },
    {
        "name": "AutoML",
        "image": "automl.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "ml", "automation"]
    },
    {
        "name": "AWS",
        "image": "aws.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["cloud", "infrastructure", "services"]
    },
    {
        "name": "BigQuery",
        "image": "bigquery.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["data-warehouse", "analytics", "google-cloud"]
    },
    {
        "name": "Chroma",
        "image": "chroma.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["vector-db", "embeddings", "rag"]
    },
    {
        "name": "Claude AI",
        "image": "claude_ai.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "anthropic"]
    },
    {
        "name": "Cloud Composer",
        "image": "cloud_composer.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["orchestration", "google-cloud", "airflow"]
    },
    {
        "name": "Cloud Data Fusion",
        "image": "cloud_data_fusion.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-integration", "etl", "google-cloud"]
    },
    {
        "name": "CockroachDB",
        "image": "cockroachdb.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["database", "distributed", "sql"]
    },
    {
        "name": "CouchDB",
        "image": "couchdb.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "nosql", "document"]
    },
    {
        "name": "CSS3",
        "image": "css3.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["frontend", "styling", "web"]
    },
    {
        "name": "Databricks",
        "image": "databricks.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["data-platform", "analytics", "spark"]
    },
    {
        "name": "Datadog",
        "image": "datadog.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["monitoring", "observability", "devops"]
    },
    {
        "name": "Dataprep",
        "image": "dataprep.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["data-preparation", "etl", "cleaning"]
    },
    {
        "name": "Dataproc",
        "image": "dataproc.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["data-processing", "google-cloud", "spark"]
    },
    {
        "name": "DBT",
        "image": "dbt.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["data-transformation", "analytics", "sql"]
    },
    {
        "name": "Django",
        "image": "django.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["backend", "framework", "python"]
    },
    {
        "name": "Docker",
        "image": "docker.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["infrastructure", "containerization", "devops"]
    },
    {
        "name": "DuckDB",
        "image": "duckdb.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["database", "analytics", "embedded"]
    },
    {
        "name": "DynamoDB",
        "image": "dynamodb.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["database", "nosql", "aws"]
    },
    {
        "name": "Elasticsearch",
        "image": "elastic_search.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["database", "search", "analytics"]
    },
    {
        "name": "FastAPI",
        "image": "fastapi.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["backend", "framework", "python"]
    },
    {
        "name": "Figma",
        "image": "figma.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["design", "ui-ux", "collaboration"]
    },
    {
        "name": "Firestore",
        "image": "firestore.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "nosql", "firebase"]
    },
    {
        "name": "Flask",
        "image": "flask.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["backend", "framework", "python"]
    },
    {
        "name": "Flink",
        "image": "flink.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["streaming", "processing", "big-data"]
    },
    {
        "name": "Gin",
        "image": "gin_go.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["backend", "framework", "go"]
    },
    {
        "name": "Git",
        "image": "git.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["version-control", "development", "collaboration"]
    },
    {
        "name": "GitHub Actions",
        "image": "github_actions.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["ci-cd", "automation", "devops"]
    },
    {
        "name": "Go",
        "image": "golang.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["language", "general-purpose"]
    },
    {
        "name": "Google App Engine",
        "image": "app_engine.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["paas", "google-cloud", "serverless"]
    },
    {
        "name": "Google Cloud",
        "image": "google_cloud.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["cloud", "infrastructure", "services"]
    },
    {
        "name": "Google Gemini",
        "image": "google_gemini.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "google"]
    },
    {
        "name": "Grafana",
        "image": "grafana.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["monitoring", "visualization", "observability"]
    },
    {
        "name": "GraphQL",
        "image": "graphql.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["api", "query-language", "web"]
    },
    {
        "name": "HTML5",
        "image": "html5.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["frontend", "markup", "web"]
    },
    {
        "name": "Hugging Face",
        "image": "huggingface.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "ml", "nlp"]
    },
    {
        "name": "Jaeger",
        "image": "jaeger_tracing.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["tracing", "observability", "monitoring"]
    },
    {
        "name": "Java",
        "image": "java.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["language", "general-purpose"]
    },
    {
        "name": "JavaScript",
        "image": "javascript.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["language", "web", "frontend"]
    },
    {
        "name": "Jupyter",
        "image": "jupyter.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["development", "data-science", "interactive"]
    },
    {
        "name": "Keras",
        "image": "keras.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["ai", "ml", "deep-learning"]
    },
    {
        "name": "Kinesis Firehose",
        "image": "kinesis_firehose.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["streaming", "aws", "data-delivery"]
    },
    {
        "name": "Kubernetes",
        "image": "kubernetes.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["infrastructure", "orchestration", "devops"]
    },
    {
        "name": "LangChain",
        "image": "langchain.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "framework"]
    },
    {
        "name": "LlamaIndex",
        "image": "llamaindex.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "rag"]
    },
    {
        "name": "Looker",
        "image": "looker.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["bi", "analytics", "visualization"]
    },
    {
        "name": "Material UI",
        "image": "material_ui.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["frontend", "ui-framework", "react"]
    },
    {
        "name": "Milvus",
        "image": "milvus_black.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["vector-db", "similarity-search", "ai"]
    },
    {
        "name": "Mistral AI",
        "image": "mistral_ai.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["ai", "llm", "open-source"]
    },
    {
        "name": "MongoDB",
        "image": "mongodb.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["database", "nosql", "document-store"]
    },
    {
        "name": "MySQL",
        "image": "mysql.svg",
        "professional_experience": True,
        "years_of_experience": 10,
        "tags": ["database", "relational", "sql"]
    },
    {
        "name": "Neo4j",
        "image": "neo4j.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["database", "graph", "nosql"]
    },
    {
        "name": "NGINX",
        "image": "nginx.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["web-server", "proxy", "load-balancer"]
    },
    {
        "name": "Node.js",
        "image": "node.js.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["backend", "runtime", "javascript"]
    },
    {
        "name": "NumPy",
        "image": "numpy.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["scientific-computing", "python", "array"]
    },
    {
        "name": "OpenAI",
        "image": "openai.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "llm", "cloud-service"]
    },
    {
        "name": "OpenTelemetry",
        "image": "opentelemetry.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["observability", "tracing", "metrics"]
    },
    {
        "name": "Pandas",
        "image": "pandas.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["data-analysis", "python", "dataframe"]
    },
    {
        "name": "PHP",
        "image": "php.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["language", "web", "backend"]
    },
    {
        "name": "Pinecone",
        "image": "pinecone.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["vector-db", "similarity-search", "ai"]
    },
    {
        "name": "Playwright",
        "image": "playwrite.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["testing", "automation", "web"]
    },
    {
        "name": "PostgreSQL",
        "image": "postgresql.svg",
        "professional_experience": True,
        "years_of_experience": 12,
        "tags": ["database", "relational", "sql"]
    },
    {
        "name": "Prefect",
        "image": "prefect.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["workflow", "orchestration", "data-pipeline"]
    },
    {
        "name": "Presto",
        "image": "presto.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["query-engine", "big-data", "sql"]
    },
    {
        "name": "Prometheus",
        "image": "prometheus.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["monitoring", "metrics", "alerting"]
    },
    {
        "name": "PubSub",
        "image": "pubsub.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["messaging", "google-cloud", "pub-sub"]
    },
    {
        "name": "Python",
        "image": "python.svg",
        "professional_experience": True,
        "years_of_experience": 15,
        "tags": ["language", "general-purpose", "scripting"]
    },
    {
        "name": "PyTorch",
        "image": "pytorch.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["ai", "ml", "deep-learning"]
    },
    {
        "name": "Quadrant",
        "image": "quadrant.svg",
        "professional_experience": True,
        "years_of_experience": 1,
        "tags": ["vector-db", "similarity-search", "ai"]
    },
    {
        "name": "RabbitMQ",
        "image": "rabbitmq.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["messaging", "queue", "broker"]
    },
    {
        "name": "RDS",
        "image": "rds.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["database", "aws", "managed"]
    },
    {
        "name": "React",
        "image": "react.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["frontend", "framework", "javascript"]
    },
    {
        "name": "Redis",
        "image": "redis.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["database", "cache", "in-memory"]
    },
    {
        "name": "Redux",
        "image": "redux.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["frontend", "state-management", "react"]
    },
    {
        "name": "Retool",
        "image": "retool.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["internal-tools", "low-code", "development"]
    },
    {
        "name": "RocksDB",
        "image": "rocksdb.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["database", "embedded", "key-value"]
    },
    {
        "name": "Rust",
        "image": "rust.svg",
        "professional_experience": False,
        "years_of_experience": 2,
        "tags": ["language", "systems"]
    },
    {
        "name": "Scala",
        "image": "scala.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["language", "functional", "big-data"]
    },
    {
        "name": "Scikit-learn",
        "image": "scikit_learn.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["ml", "python", "data-science"]
    },
    {
        "name": "Snowflake",
        "image": "snowflake.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["data-warehouse", "cloud", "analytics"]
    },
    {
        "name": "Socket.io",
        "image": "socketdotio.svg",
        "professional_experience": True,
        "years_of_experience": 4,
        "tags": ["realtime", "websockets", "networking"]
    },
    {
        "name": "Splunk",
        "image": "splunk.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["monitoring", "logging", "analytics"]
    },
    {
        "name": "SQL",
        "image": "sql.svg",
        "professional_experience": True,
        "years_of_experience": 15,
        "tags": ["language", "database", "query"]
    },
    {
        "name": "SQLAlchemy",
        "image": "sqlalchemy.svg",
        "professional_experience": True,
        "years_of_experience": 8,
        "tags": ["backend", "orm", "python"]
    },
    {
        "name": "Streamlit",
        "image": "streamlit.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["visualization", "python", "dashboard"]
    },
    {
        "name": "Supabase",
        "image": "supabase_logo.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["backend", "database", "authentication"]
    },
    {
        "name": "Svelte",
        "image": "svelte.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["frontend", "framework", "javascript"]
    },
    {
        "name": "Tableau",
        "image": "tableau_software.svg",
        "professional_experience": True,
        "years_of_experience": 7,
        "tags": ["visualization", "bi", "analytics"]
    },
    {
        "name": "Tailwind CSS",
        "image": "tailwind_css.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["css", "frontend", "styling"]
    },
    {
        "name": "TensorFlow",
        "image": "tensorflow.svg",
        "professional_experience": True,
        "years_of_experience": 6,
        "tags": ["ai", "ml", "deep-learning"]
    },
    {
        "name": "Terraform",
        "image": "hashicorp_terraform.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["infrastructure", "iac", "devops"]
    },
    {
        "name": "TimescaleDB",
        "image": "timescale.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["database", "timeseries", "postgresql"]
    },
    {
        "name": "Trino",
        "image": "trino.svg",
        "professional_experience": True,
        "years_of_experience": 3,
        "tags": ["query-engine", "sql", "big-data"]
    },
    {
        "name": "tRPC",
        "image": "trpc.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["backend", "api", "typescript"]
    },
    {
        "name": "TypeScript",
        "image": "typescript.svg",
        "professional_experience": True,
        "years_of_experience": 5,
        "tags": ["language", "javascript", "static-typing"]
    },
    {
        "name": "Vertex AI",
        "image": "vertexai.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["ai", "ml", "google-cloud"]
    },
    {
        "name": "Vite",
        "image": "vite.js.svg",
        "professional_experience": True,
        "years_of_experience": 2,
        "tags": ["build-tool", "frontend", "development"]
    },
    {
        "name": "WebAssembly",
        "image": "webassembly.svg",
        "professional_experience": False,
        "years_of_experience": 1,
        "tags": ["web", "performance", "low-level"]
    }
]
