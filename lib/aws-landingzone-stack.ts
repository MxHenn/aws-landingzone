import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import * as sso from 'aws-cdk-lib/aws-sso'
import * as organizations from 'aws-cdk-lib/aws-organizations'
import { Account, OrganizationalUnit, OrganizationsScpPolicy, SsmParameterString } from './constructs'
import { AwsTeamAccountNestedStack } from './aws-team-accounts'
import { OidcProvider } from './oidc-provider'
import { GithubCicdRole } from './identities'
import { DataAiTeam } from './data-ai-team'

export class AwsLandingzoneStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const ssoId = new SsmParameterString(this, 'sso-id', { identifier: 'sso-id' })
    const identityStoreId = new SsmParameterString(this, 'identity-store-id', { identifier: 'identity-store-id' })

    const { openIdConnectProvider: oidcProvider } = new OidcProvider(this, 'oidc-provider')
    new GithubCicdRole(this, 'github-cicd-role', { oidcProvider })

    const orga = new organizations.CfnOrganization(this, 'pexon-root-orga', {})
    orga.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

    const rootId = orga.getAtt('RootId').toString()

    const pexonConsultingOu = new OrganizationalUnit(this, 'pexon-consulting-ou', {
      name: 'PexonConsultingOU',
      parentId: rootId,
    })

    const ouAwsTeams = new OrganizationalUnit(this, 'ou-aws-teams', {
      name: 'OU - AWS Teams',
      parentId: rootId,
    })

    const permissionSet = new sso.CfnPermissionSet(this, 'team-administrator-access-permission-set', {
      instanceArn: `arn:aws:sso:::instance/${ssoId.value}`,
      name: 'Cloud-Team-AdministratorAccess',
      sessionDuration: 'PT1H',
      managedPolicies: ['arn:aws:iam::aws:policy/AdministratorAccess'],
    })

    new AwsTeamAccountNestedStack(this, 'ou-team-west-vader', {
      ouAwsTeams,
      teamName: 'west-vader',
      accountName: 'west-vader',
      eMail: 'west-aws-vader@pexon-consulting.de',
      permissionSet,
      userIds: ['99672b9ab3-4bf9a7f9-ec39-4d3e-a46d-3308b87933d3', '99672b9ab3-59c6547b-3876-4f85-8402-5ac57a9d4398'],
      ssoId: ssoId.value,
      identityStoreId: identityStoreId.value,
    })
    new AwsTeamAccountNestedStack(this, 'ou-team-nord-neo', {
      ouAwsTeams,
      teamName: 'nord-neo',
      accountName: 'nord-neo',
      eMail: 'nord-aws-neo@pexon-consulting.de',
      permissionSet,
      userIds: ['83342872-0051-705e-47bb-bb4df9b05df8', '99672b9ab3-59c6547b-3876-4f85-8402-5ac57a9d4398'],
      ssoId: ssoId.value,
      identityStoreId: identityStoreId.value,
    })
    new AwsTeamAccountNestedStack(this, 'ou-team-sued-sora', {
      ouAwsTeams,
      teamName: 'sued-sora',
      accountName: 'ou-team-sued-sora',
      eMail: 'sued-aws-sora@pexon-consulting.de',
      permissionSet,
      userIds: ['99672b9ab3-07cedb79-95b3-47ab-85bf-8b333da8fa8c', '99672b9ab3-59c6547b-3876-4f85-8402-5ac57a9d4398'],
      ssoId: ssoId.value,
      identityStoreId: identityStoreId.value,
    })

    new DataAiTeam(this, 'data-ai-team', {
      rootId,
      identityStoreId: identityStoreId.value,
      permissionSet,
      ssoId: ssoId.value,
    })

    new Account(this, 'account-pexonconsulting', {
      accountName: 'pexonconsulting',
      email: 'EMEA.CTA.payer507@aws.tdsynnex.com',
      organizationalUnit: pexonConsultingOu,
    })

    new Account(this, 'account-databricks-poc', {
      accountName: 'databricks-poc',
      email: 'databricks-poc@pexon-consulting.de',
      organizationalUnit: pexonConsultingOu,
    })
  }
}
