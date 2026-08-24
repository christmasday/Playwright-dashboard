import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

export interface TestRunAttributes {
  id: string;
  buildId: string;
  name: string;
  title: string;
  file: string;
  tags: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky' | 'timeout' | 'quarantined';
  duration: number;
  retries: number;
  quarantineReason?: string;
  quarantineExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestRunCreationAttributes extends Partial<TestRunAttributes> {
  tags?: string[];
}

export interface TestRunInstance extends Model<TestRunAttributes>, TestRunAttributes {}

class TestRun extends Model<TestRunAttributes, TestRunCreationAttributes> {
  public id!: string;
  public buildId!: string;
  public name!: string;
  public title!: string;
  public file!: string;
  public tags!: string;
  public status!: 'passed' | 'failed' | 'skipped' | 'flaky' | 'timeout' | 'quarantined';
  public duration!: number;
  public retries!: number;
  public quarantineReason?: string;
  public quarantineExpiresAt?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;

  public static readonly tableName = 'test_runs';

  public static associations: any;
}

TestRun.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    buildId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    file: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM('passed', 'failed', 'skipped', 'flaky', 'timeout', 'quarantined'),
      defaultValue: 'skipped',
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    retries: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    quarantineReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quarantineExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'TestRun',
    tableName: TestRun.tableName,
    indexes: [
      {
        fields: ['buildId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['tags'],
        using: 'GIN',
      },
    ],
  }
);

export default TestRun;
