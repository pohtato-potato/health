// THE JOB LIST. Later forks add their jobs here, one line each (scout, study a target, negotiate, lobby, the cast).
import type { JobDef, JobId } from '../types';
import { academy } from './academy';
import { cast } from './cast';
import { column } from './column';
import { course } from './course';
import { lobby } from './lobby';
import { negotiate } from './negotiate';
import { project } from './project';
import { scout } from './scout';
import { study } from './study';
import { watch } from './watch';

/** In the order the desk shows them. */
export const JOBS: JobDef[] = [watch, scout, study, negotiate, lobby, academy, cast, project, column, course];
export const jobById = (id: JobId): JobDef | undefined => JOBS.find((j) => j.id === id);
