const Schema = `#graphql

enum StudyStatus 
{ Planned Active Completed
  }
enum SiteStatus
 {
 Planned 
 Active
  Closed 
 }
enum ExaminerRole 
{ 
Principal_Investigator 
Sub_Investigator
 }

type Counts 
{ 
studies: Int! 
 sites: Int!
examiners: Int! }

type Certificate {
  id: ID!
  examiner_id: ID!
  protocol_id: String!
  expiry_date: String!
  study_name: String
  study_end_date: String
}

type Study {
  protocol_id: String!
  study_name: String!
  sponsor: String!
  phase: String
  start_date: String
  end_date: String
  status: StudyStatus!
  sites: [Site!]!
  assigned_examiner_ids: [ID!]
}

type Examiner {
  examiner_id: ID!
  name: String!
  role: String!
  site_status: String!
  study_status: String!
  sites: [Site!]!
  studies: [Study!]!
  certificates: [Certificate!]!
}

type Site {
  site_id: ID!
  site_name: String!
  city: String
  country: String
  status: SiteStatus!
  examiners: [Examiner!]!
  all_examiners: [Examiner!]
  studies: [Study!]!
}

type User {
  user_id: ID!
  username: String!
  email: String!
  role: String!
  permissions: [String!]!
}

type LoginResponse 
{
 success: Boolean! 
 message: String user: User 
 token: String
 }

type AuditLog {
  log_id: ID!
  action: String!
  entity_type: String!
  entity_id: String!
  details: String
  performed_by: String
  created_at: String!
}

type StudyDetail {
  study: Study
  sites: [Site!]!
  examiners: [Examiner!]!
}

type SiteDetail {
  site: Site
  studies: [Study!]!
  examiners: [Examiner!]!
}

type ExaminerDetail {
  examiner: Examiner
  sites: [Site!]!
  studies: [Study!]!
}

type UnassignedForSite {
  studies: [Study!]!
  examiners: [Examiner!]!
}

type PaginatedStudies {
  items: [Study!]!
  total: Int!
  totalPages: Int!
}

type PaginatedSites {
  items: [Site!]!
  total: Int!
  totalPages: Int!
}

type PaginatedExaminers {
  items: [Examiner!]!
  total: Int!
  totalPages: Int!
}

type Query {
  counts: Counts!
  studies(page: Int, perPage: Int, search: String, sortCol: String, sortDir: String): PaginatedStudies!
  sites(page: Int, perPage: Int, search: String, sortCol: String, sortDir: String): PaginatedSites!
  examiners(page: Int, perPage: Int, search: String, sortCol: String, sortDir: String): PaginatedExaminers!
  studyDetail(protocol_id: String!): StudyDetail!
  siteDetail(site_id: ID!): SiteDetail!
  examinerDetail(examiner_id: ID!): ExaminerDetail!
  unassignedSitesForStudy(protocol_id: String!): [Site!]!
  unassignedForSite(site_id: ID!): UnassignedForSite!
  unassignedSitesForExaminer(examiner_id: ID!): [Site!]!
  auditLogs(entity_type: String, entity_id: String): [AuditLog!]!
  users: [User!]!
}

type Mutation {
  createStudy(study_name: String! sponsor: String! phase: String protocol_id: String! start_date: String end_date: String): Study!
  createSite(site_name: String! city: String country: String examiner_id: ID): Site!
  createExaminer(name: String! role: ExaminerRole! cert_study: String cert_expiry: String): Examiner!
  assignStudyToSite(protocol_id: String! site_id: ID!): Boolean!
  assignExaminerToSite(protocol_id: String site_id: ID! examiner_id: ID!): Boolean!
  unassignExaminerFromSite(protocol_id: String! site_id: ID! examiner_id: ID!): Boolean!
  upsertCertificate(examiner_id: ID! protocol_id: String! expiry_date: String!): Certificate!
  updateStudy(protocol_id: String! study_name: String sponsor: String phase: String start_date: String end_date: String status: StudyStatus): Study!
  updateExaminer(examiner_id: ID! name: String role: ExaminerRole): Examiner!
  updateSite(site_id: ID! site_name: String city: String country: String status: SiteStatus): Site!
  login(usernameOrEmail: String! password: String!): LoginResponse!
}
`;

module.exports = { Schema };
