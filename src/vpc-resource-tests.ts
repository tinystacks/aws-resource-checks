import isNil from 'lodash.isnil';
import get from 'lodash.get';
import isString from 'lodash.isstring';
import isPlainObject from 'lodash.isplainobject';
import {
  logger,
  ResourceDiffRecord,
  CheckOptions,
  Json,
  ROUTE_TABLE_ASSOCIATION,
  SUBNET,
  getStandardResourceType,
  CliError
} from '@tinystacks/precloud';

// eslint-disable-next-line no-shadow
enum SubnetType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  ISOLATED = 'ISOLATED'
}

interface SubnetRecord {
  type: SubnetType;
  resourceRecord: ResourceDiffRecord;
}

function referencesLogicalId (resource: Json, property: string, logicalId: string): boolean {
  const referencedProperty = get(resource?.properties, property);
  if (isString(referencedProperty)) return referencedProperty.includes(logicalId);
  if(isPlainObject(referencedProperty)) return referencedProperty.Ref === logicalId;
  return false;
}

function getSubnetsForVpc (vpcResource: ResourceDiffRecord, allResources: ResourceDiffRecord[]): SubnetRecord[] {
  const { logicalId: vpcLogicalId } = vpcResource;
  return allResources.filter((resource: ResourceDiffRecord) => 
    getStandardResourceType(resource.resourceType) === SUBNET &&
    referencesLogicalId(resource, 'vpcId', vpcLogicalId)
  ).map<SubnetRecord>((subnetResource: ResourceDiffRecord) => {
    const { logicalId: subnetLogicalId } = subnetResource;
    
    const routeTableAssociation: ResourceDiffRecord = allResources.find((resource: ResourceDiffRecord) =>
      getStandardResourceType(resource.resourceType) === ROUTE_TABLE_ASSOCIATION &&
      referencesLogicalId(resource, 'subnetId', subnetLogicalId)
    );
    
    const routeTable = allResources.find((resource: ResourceDiffRecord) => referencesLogicalId(routeTableAssociation, 'routeTableId', resource.logicalId));
    
    const routes = routeTable?.properties?.routeSet;
    
    const isPublic = routes?.some((route: Json) => route.destinationCidrBlock === '0.0.0.0/0' && !isNil(route.gatewayId));
    const isPrivate = !isPublic && routes?.some((route: Json) => route.destinationCidrBlock === '0.0.0.0/0' && !isNil(route.natGatewayId));

    let subnetType = SubnetType.ISOLATED;
    if (isPublic) subnetType = SubnetType.PUBLIC;
    if (isPrivate) subnetType = SubnetType.PRIVATE;

    return {
      type: subnetType,
      resourceRecord: subnetResource
    };
  });
}

async function verifyVpcHasPrivateSubnets (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[]) {
  logger.info('Verifying subnet configuration...');
  const subnets = getSubnetsForVpc(resource, allResources);
  const privateSubnets = subnets.filter((subnet: SubnetRecord) => subnet.type === SubnetType.PRIVATE);
  if (privateSubnets.length === 0) {
    throw new CliError('Missing private subnets!', `Based on the configuration passed, private subnets with a NAT Gateway are required for all vpcs but none was found for "${resource?.logicalId}".`);
  }
}

async function vpcResourceTest (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], config: CheckOptions) {
  if (config.requirePrivateSubnet) {
    await verifyVpcHasPrivateSubnets(resource, allResources);
  }
}

export {
  vpcResourceTest
};