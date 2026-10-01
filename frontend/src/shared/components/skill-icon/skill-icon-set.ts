import type React from 'react';

import AirbyteIcon from '../../../assets/icons/airbyte.svg?react';
import ApacheflinkIcon from '../../../assets/icons/apacheflink.svg?react';
import ApachepulsarIcon from '../../../assets/icons/apachepulsar.svg?react';
import ApacherocketmqIcon from '../../../assets/icons/apacherocketmq.svg?react';
import AwsIcon from '../../../assets/icons/aws.svg?react';
import DatadogIcon from '../../../assets/icons/datadog.svg?react';
import DjangoIcon from '../../../assets/icons/django.svg?react';
import DuckdbIcon from '../../../assets/icons/duckdb.svg?react';
import FlaskIcon from '../../../assets/icons/flask.svg?react';
import JupyterIcon from '../../../assets/icons/jupyter.svg?react';
import KafkaIcon from '../../../assets/icons/kafka.svg?react';
import KubernetesIcon from '../../../assets/icons/kubernetes.svg?react';
import LangchainIcon from '../../../assets/icons/langchain.svg?react';
import LlamaindexIcon from '../../../assets/icons/llamaindex.svg?react';
import MilvusBlackIcon from '../../../assets/icons/milvus_black.svg?react';
import Neo4jIcon from '../../../assets/icons/neo4j.svg?react';
import OpenaiIcon from '../../../assets/icons/openai.svg?react';
import PandasIcon from '../../../assets/icons/pandas.svg?react';
import PineconeIcon from '../../../assets/icons/pinecone.svg?react';
import PrefectIcon from '../../../assets/icons/prefect.svg?react';
import RetoolIcon from '../../../assets/icons/retool.svg?react';
import RustIcon from '../../../assets/icons/rust.svg?react';
import ScikitLearnIcon from '../../../assets/icons/scikit_learn.svg?react';
import SocketdotioIcon from '../../../assets/icons/socketdotio.svg?react';
import SplunkIcon from '../../../assets/icons/splunk.svg?react';
import SqlalchemyIcon from '../../../assets/icons/sqlalchemy.svg?react';
import TimescaleIcon from '../../../assets/icons/timescale.svg?react';
import TrinoIcon from '../../../assets/icons/trino.svg?react';
import TrpcIcon from '../../../assets/icons/trpc.svg?react';
import PostgresqlIcon from '../../../assets/icons/postgresql.svg?react';

/**
 * Every skill icon that is inlined as an SVG component (so it can inherit
 * `currentColor` from the theme). Bundled as ONE lazily-loaded chunk: as
 * separate dynamic imports each icon was its own JS request (~30 on the
 * skills section alone).
 */
const SKILL_ICON_SET: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'airbyte.svg': AirbyteIcon,
  'apacheflink.svg': ApacheflinkIcon,
  'apachepulsar.svg': ApachepulsarIcon,
  'apacherocketmq.svg': ApacherocketmqIcon,
  'aws.svg': AwsIcon,
  'datadog.svg': DatadogIcon,
  'django.svg': DjangoIcon,
  'duckdb.svg': DuckdbIcon,
  'flask.svg': FlaskIcon,
  'jupyter.svg': JupyterIcon,
  'kafka.svg': KafkaIcon,
  'kubernetes.svg': KubernetesIcon,
  'langchain.svg': LangchainIcon,
  'llamaindex.svg': LlamaindexIcon,
  'milvus_black.svg': MilvusBlackIcon,
  'neo4j.svg': Neo4jIcon,
  'openai.svg': OpenaiIcon,
  'pandas.svg': PandasIcon,
  'pinecone.svg': PineconeIcon,
  'prefect.svg': PrefectIcon,
  'retool.svg': RetoolIcon,
  'rust.svg': RustIcon,
  'scikit_learn.svg': ScikitLearnIcon,
  'socketdotio.svg': SocketdotioIcon,
  'splunk.svg': SplunkIcon,
  'sqlalchemy.svg': SqlalchemyIcon,
  'timescale.svg': TimescaleIcon,
  'trino.svg': TrinoIcon,
  'trpc.svg': TrpcIcon,
  'postgresql.svg': PostgresqlIcon,
};

export default SKILL_ICON_SET;
