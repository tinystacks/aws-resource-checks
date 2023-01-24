# @tinystacks/aws-resource-checks
A set of pre-deployment resource checks intended as a plugin for [@tinystacks/precloud](https://www.npmjs.com/package/@tinystacks/precloud).

## How To Use
By default, this plugin is included as a peer dependency of the [precloud cli](https://github.com/tinystacks/precloud) and is therefore always available.

## Supported Resource Checks
This plugin performs the following checks when `precloud check` is run:
1. Verifies new S3 buckets have unique names if configured.
1. Verifies new SQS Queues have unique names if configured.
1. If `requirePrivateSubnets` is set to true in the precloud config, verifies any new VPC has a subnet with egress only configured via a NAT Gateway or Nat Instance(s).