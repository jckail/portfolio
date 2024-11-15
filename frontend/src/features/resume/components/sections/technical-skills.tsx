import React, { useState, useEffect } from 'react';
import '../../styles/sections/technical-skills.css';

// Import SVGs directly
import AirbyteIcon from '../../../../assets/icons/neutral/airbyte.svg?react';
import ApacheFlinkIcon from '../../../../assets/icons/neutral/apacheflink.svg?react';
import ApachePulsarIcon from '../../../../assets/icons/neutral/apachepulsar.svg?react';
import ApacheRocketMQIcon from '../../../../assets/icons/neutral/apacherocketmq.svg?react';
import AWSIcon from '../../../../assets/icons/neutral/aws.svg?react';
import DatadogIcon from '../../../../assets/icons/neutral/datadog.svg?react';
import DjangoIcon from '../../../../assets/icons/neutral/django.svg?react';
import DuckDBIcon from '../../../../assets/icons/neutral/duckdb.svg?react';
import FlaskIcon from '../../../../assets/icons/neutral/flask.svg?react';
import JupyterIcon from '../../../../assets/icons/neutral/jupyter.svg?react';
import KafkaIcon from '../../../../assets/icons/neutral/kafka.svg?react';
import LangchainIcon from '../../../../assets/icons/neutral/langchain.svg?react';
import LlamaIndexIcon from '../../../../assets/icons/neutral/llamaindex.svg?react';
import MilvusIcon from '../../../../assets/icons/neutral/milvus_black.svg?react';
import Neo4jIcon from '../../../../assets/icons/neutral/neo4j.svg?react';
import OpenAIIcon from '../../../../assets/icons/neutral/openai.svg?react';
import PandasIcon from '../../../../assets/icons/neutral/pandas.svg?react';
import PineconeIcon from '../../../../assets/icons/neutral/pinecone.svg?react';
import PrefectIcon from '../../../../assets/icons/neutral/prefect.svg?react';
import RetoolIcon from '../../../../assets/icons/neutral/retool.svg?react';
import RustIcon from '../../../../assets/icons/neutral/rust.svg?react';
import ScikitLearnIcon from '../../../../assets/icons/neutral/scikit_learn.svg?react';
import SocketIOIcon from '../../../../assets/icons/neutral/socketdotio.svg?react';
import SplunkIcon from '../../../../assets/icons/neutral/splunk.svg?react';
import SQLAlchemyIcon from '../../../../assets/icons/neutral/sqlalchemy.svg?react';
import TimescaleIcon from '../../../../assets/icons/neutral/timescale.svg?react';
import TrinoIcon from '../../../../assets/icons/neutral/trino.svg?react';
import tRPCIcon from '../../../../assets/icons/neutral/trpc.svg?react';
import PostgreSQLIcon from '../../../../assets/icons/neutral/postgresql.svg?react';

interface Skill {
  display_name: string;
  image: string;
  professional_experience: boolean;
  years_of_experience: number;
  tags: string[];
  description: string;
  weblink: string;
  examples: Record<string, any>;
  general_category: string;
  sub_category: string;
}

interface SkillsData {
  [key: string]: Skill;
}

interface SkillModalProps {
  skill: Skill;
  onClose: () => void;
}

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
}

// Map of SVG components
const SVG_COMPONENTS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'airbyte.svg': AirbyteIcon,
  'apacheflink.svg': ApacheFlinkIcon,
  'apachepulsar.svg': ApachePulsarIcon,
  'apacherocketmq.svg': ApacheRocketMQIcon,
  'aws.svg': AWSIcon,
  'datadog.svg': DatadogIcon,
  'django.svg': DjangoIcon,
  'duckdb.svg': DuckDBIcon,
  'flask.svg': FlaskIcon,
  'jupyter.svg': JupyterIcon,
  'kafka.svg': KafkaIcon,
  'langchain.svg': LangchainIcon,
  'llamaindex.svg': LlamaIndexIcon,
  'milvus_black.svg': MilvusIcon,
  'neo4j.svg': Neo4jIcon,
  'openai.svg': OpenAIIcon,
  'pandas.svg': PandasIcon,
  'pinecone.svg': PineconeIcon,
  'prefect.svg': PrefectIcon,
  'retool.svg': RetoolIcon,
  'rust.svg': RustIcon,
  'scikit_learn.svg': ScikitLearnIcon,
  'socketdotio.svg': SocketIOIcon,
  'splunk.svg': SplunkIcon,
  'sqlalchemy.svg': SQLAlchemyIcon,
  'timescale.svg': TimescaleIcon,
  'trino.svg': TrinoIcon,
  'trpc.svg': tRPCIcon,
  'postgresql.svg': PostgreSQLIcon,
};

const SkillIcon: React.FC<IconProps> = ({ name, className = 'skill-icon', size = 32, ...props }) => {
  const SvgComponent = SVG_COMPONENTS[name];

  if (SvgComponent) {
    return (
      <SvgComponent
        width={size}
        height={size}
        className={className}
        {...props}
      />
    );
  }

  // Fallback to regular image for non-neutral icons
  return (
    <img 
      src={`/images/icons/${name}`}
      alt={name.replace('.svg', '')}
      width={size}
      height={size}
      className={className}
      {...props}
    />
  );
};

const SkillModal: React.FC<SkillModalProps> = ({ skill, onClose }) => {
  return (
    <div className="skill-modal-overlay" onClick={onClose}>
      <div className="skill-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <div className="modal-icon-wrapper">
          <div className="icon-wrapper">
                        <SkillIcon
                          name={skill.image}
                          className="skill-icon"
                          size={32}
                          aria-label={skill.display_name}
                        />
                      </div>
          </div>
          <h3>{skill.display_name}</h3>
        </div>
        <div className="modal-body">
          <p className="experience-info">
            <strong>{skill.years_of_experience} years</strong> of experience
            {skill.professional_experience && " (Professional)"}
          </p>
          <p className="skill-description">{skill.description}</p>
          <div className="skill-tags">
            {skill.tags.map((tag, index) => (
              <span key={index} className="skill-tag">
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
          {Object.keys(skill.examples).length > 0 && (
            <div className="examples-section">
              <h4>Examples:</h4>
              <ul>
                {Object.entries(skill.examples).map(([key, value]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            </div>
          )}
          <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="visit-website-btn">
            Visit Website
          </a>
        </div>
      </div>
    </div>
  );
};

const TechnicalSkills: React.FC = () => {
  const [skills, setSkills] = useState<SkillsData>({});
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills');
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data = await response.json();
        setSkills(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  if (loading) return <div className="loading-skills">Loading skills...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  const categorizedSkills = Object.entries(skills).reduce((acc, [key, skill]) => {
    const category = skill.general_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...skill });
    return acc;
  }, {} as Record<string, (Skill & { key: string })[]>);

  return (
    <section id="skills" className="section-container">
      <div className="section-header">
        <h2>Technical Skills</h2>
      </div>
      <div className="section-content">
        <div className="skills-grid">
          {Object.entries(categorizedSkills).map(([category, skillList]) => (
            <div key={category} className="skill-category">
              <h3>{category}</h3>
              <div className="skill-list">
                {skillList.map((skill, index) => (
                  <div
                    key={skill.key}
                    className="skill-item"
                    onClick={() => setSelectedSkill(skill.key)}
                    style={{ '--item-index': index } as React.CSSProperties}
                    title={`${skill.years_of_experience} years${skill.professional_experience ? ' (Professional)' : ''}`}
                  >
                    <div className="skill-icon-container">
                      <div className="icon-wrapper">
                        <SkillIcon
                          name={skill.image}
                          className="skill-icon"
                          size={32}
                          aria-label={skill.display_name}
                        />
                      </div>
                      <span className="skill-name">{skill.display_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSkill && skills[selectedSkill] && (
        <SkillModal
          skill={skills[selectedSkill]}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </section>
  );
};

export default TechnicalSkills;
