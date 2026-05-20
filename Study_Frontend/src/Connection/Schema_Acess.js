import { gql } from "@apollo/client";

export const LOGIN = gql`
  mutation Login($usernameOrEmail: String!, $password: String!) {
    login(usernameOrEmail: $usernameOrEmail, password: $password) {
      success message token user { user_id username email role permissions }
    }
  }
`;

export const GET_COUNTS = gql`
  query DashboardCounts { counts { studies sites examiners } }
`;

export const GET_STUDIES = gql`
  query StudiesList($page: Int, $perPage: Int, $search: String, $sortCol: String, $sortDir: String) {
    studies(page: $page, perPage: $perPage, search: $search, sortCol: $sortCol, sortDir: $sortDir) {
      items { protocol_id study_name sponsor phase start_date end_date status }
      total totalPages
    }
  }
`;

export const GET_STUDY_DETAIL = gql`
  query StudyDetail($protocol_id: String!) {
    studyDetail(protocol_id: $protocol_id) {
      study {
        protocol_id study_name sponsor phase start_date end_date status
        sites {
          site_id site_name city country status
          examiners { examiner_id name role }
          all_examiners { examiner_id name role certificates { protocol_id expiry_date } }
        }
      }
    }
  }
`;

export const GET_SITES = gql`
  query SitesList($page: Int, $perPage: Int, $search: String, $sortCol: String, $sortDir: String) {
    sites(page: $page, perPage: $perPage, search: $search, sortCol: $sortCol, sortDir: $sortDir) {
      items { site_id site_name city country status }
      total totalPages
    }
  }
`;

export const GET_SITE_DETAIL = gql`
  query SiteDetail($site_id: ID!) {
    siteDetail(site_id: $site_id) {
      site {
        site_id site_name city country status
        studies { protocol_id study_name sponsor phase start_date end_date status assigned_examiner_ids }
        examiners { examiner_id name role studies { protocol_id study_name status } certificates { protocol_id expiry_date } }
      }
    }
  }
`;

export const GET_EXAMINERS = gql`
  query ExaminersList($page: Int, $perPage: Int, $search: String, $sortCol: String, $sortDir: String) {
    examiners(page: $page, perPage: $perPage, search: $search, sortCol: $sortCol, sortDir: $sortDir) {
      items { examiner_id name role site_status study_status }
      total totalPages
    }
  }
`;

export const GET_EXAMINER_DETAIL = gql`
  query ExaminerDetail($examiner_id: ID!) {
    examinerDetail(examiner_id: $examiner_id) {
      examiner {
        examiner_id name role site_status study_status
        studies { protocol_id study_name sponsor phase start_date end_date status }
        sites { site_id site_name city country status studies { protocol_id study_name status } }
        certificates { id protocol_id expiry_date study_name study_end_date }
      }
    }
  }
`;

export const GET_SEARCH_DATA = gql`
  query GlobalSearch {
    studies { items { protocol_id study_name sponsor status } }
    sites { items { site_id site_name city country status } }
    examiners { items { examiner_id name role site_status } }
  }
`;

export const CREATE_STUDY = gql`
  mutation CreateStudy($protocol_id: String!, $study_name: String!, $sponsor: String!, $phase: String, $start_date: String, $end_date: String) {
    createStudy(protocol_id: $protocol_id, study_name: $study_name, sponsor: $sponsor, phase: $phase, start_date: $start_date, end_date: $end_date) {
      protocol_id study_name
    }
  }
`;

export const CREATE_SITE = gql`
  mutation CreateSite($site_name: String!, $city: String, $country: String, $examiner_id: ID) {
    createSite(site_name: $site_name, city: $city, country: $country, examiner_id: $examiner_id) {
      site_id site_name
    }
  }
`;

export const CREATE_EXAMINER = gql`
  mutation CreateExaminer($name: String!, $role: ExaminerRole!, $cert_study: String, $cert_expiry: String) {
    createExaminer(name: $name, role: $role, cert_study: $cert_study, cert_expiry: $cert_expiry) {
      examiner_id name
    }
  }
`;

export const ASSIGN_STUDY_TO_SITE = gql`
  mutation AssignStudyToSite($protocol_id: String!, $site_id: ID!) {
    assignStudyToSite(protocol_id: $protocol_id, site_id: $site_id)
  }
`;

export const ASSIGN_EXAMINER = gql`
  mutation AssignExaminerToSite($protocol_id: String, $site_id: ID!, $examiner_id: ID!) {
    assignExaminerToSite(protocol_id: $protocol_id, site_id: $site_id, examiner_id: $examiner_id)
  }
`;

export const UNASSIGN_EXAMINER = gql`
  mutation UnassignExaminer($protocol_id: String!, $site_id: ID!, $examiner_id: ID!) {
    unassignExaminerFromSite(protocol_id: $protocol_id, site_id: $site_id, examiner_id: $examiner_id)
  }
`;

export const UPSERT_CERTIFICATE = gql`
  mutation UpsertCertificate($examiner_id: ID!, $protocol_id: String!, $expiry_date: String!) {
    upsertCertificate(examiner_id: $examiner_id, protocol_id: $protocol_id, expiry_date: $expiry_date) {
      id expiry_date study_name study_end_date
    }
  }
`;

export const UPDATE_STUDY = gql`
  mutation UpdateStudy($protocol_id: String!, $status: StudyStatus, $end_date: String) {
    updateStudy(protocol_id: $protocol_id, status: $status, end_date: $end_date) { protocol_id status end_date }
  }
`;

export const UPDATE_EXAMINER = gql`
  mutation UpdateExaminer($examiner_id: ID!, $name: String, $role: ExaminerRole) {
    updateExaminer(examiner_id: $examiner_id, name: $name, role: $role) { examiner_id name role }
  }
`;

export const UPDATE_SITE = gql`
  mutation UpdateSite($site_id: ID!, $site_name: String, $city: String, $country: String, $status: SiteStatus) {
    updateSite(site_id: $site_id, site_name: $site_name, city: $city, country: $country, status: $status) { site_id site_name city country status }
  }
`;

export const GET_UNASSIGNED_SITES_FOR_STUDY = gql`
  query UnassignedSitesForStudy($protocol_id: String!) {
    unassignedSitesForStudy(protocol_id: $protocol_id) {
      site_id site_name city country status examiners { examiner_id name role certificates { protocol_id expiry_date } }
    }
  }
`;

export const GET_UNASSIGNED_FOR_SITE = gql`
  query UnassignedForSite($site_id: ID!) {
    unassignedForSite(site_id: $site_id) {
      studies { protocol_id study_name sponsor status }
      examiners { examiner_id name role certificates { protocol_id expiry_date } }
    }
  }
`;

export const GET_UNASSIGNED_SITES_FOR_EXAMINER = gql`
  query UnassignedSitesForExaminer($examiner_id: ID!) {
    unassignedSitesForExaminer(examiner_id: $examiner_id) {
      site_id site_name city country status studies { protocol_id study_name start_date end_date status }
    }
  }
`;

export const GET_STUDIES_WITH_SITES = gql`
  query StudiesWithSites {
    studies {
      items {
        protocol_id study_name start_date
        sites { site_id site_name }
      }
    }
  }
`;

export const GET_AUDIT_LOGS = gql`
  query AuditLogs($entity_type: String, $entity_id: String) {
    auditLogs(entity_type: $entity_type, entity_id: $entity_id) {
      log_id action entity_type entity_id details performed_by created_at
    }
  }
`;
