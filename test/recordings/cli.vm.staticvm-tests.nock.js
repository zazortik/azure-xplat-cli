var profile = require('../../lib/util/profile');
exports.getMockedProfile = function() {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
    managementCertificate: {
      key: 'mockedKey',
      cert: 'mockedCert'
    },
    name: 'Azure SDK sandbox',
    username: 'user@domain.example',
    registeredProviders: ['website', 'sqlserver'],
    registeredResourceNamespaces: [],
    isDefault: true
  }, newProfile.environments['AzureCloud']));

  return newProfile;
};
exports.setEnvironment = function() {
  process.env['AZURE_VM_TEST_LOCATION'] = 'West US';
}
exports.scopes = [
  [

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/virtualnetwork')
        .reply(200, "<VirtualNetworkSites><VirtualNetworkSite><Name>5abcd</Name><Id>456b1f19-212f-47a0-85e2-032504975642</Id><AffinityGroup>RubyT</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.10/12</AddressPrefix><AddressPrefix>10.0.0.0/8</AddressPrefix><AddressPrefix>192.168.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/12</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns></VirtualNetworkSite><VirtualNetworkSite><Name>mynetwork</Name><Id>386452bd-5cef-4eea-a889-a6e5d0635381</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.4.0.0/16</AddressPrefix><AddressPrefix>10.1.0.0/16</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.4.2.0/19</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.4.32.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>ne@@wvnet$$%10</Name><Id>c27720fe-1c7c-429b-85ec-09cf605307e2</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>new_network</Name><Id>69d6faab-d75c-43c4-a41a-20c36040f0c5</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>newvnet$$%10</Name><Id>1e045b27-4b5a-42f6-8399-23a85df51702</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>testy</Name><Id>06bb8c56-83da-499e-8585-2609db606247</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.11/8</AddressPrefix><AddressPrefix>172.16.77.0/12</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.0.0.0/11</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.32.0.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>Vnet</Name><Id>a9001b93-75cc-4580-94b4-a200654da28e</Id><AffinityGroup>EastAsia</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.0/28</AddressPrefix><AddressPrefix>192.168.29.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/29</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>172.16.0.8/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>XplatNetWest</Name><Id>b2f72f3b-db23-4c7e-8255-89215463ab45</Id><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/19</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/22</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite><VirtualNetworkSite><Name>XplatVnet</Name><Id>2831c826-01f1-47e2-8026-aab52acebf48</Id><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/20</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/23</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite></VirtualNetworkSites>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices')
        .reply(200, "<HostedServices xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><HostedService><Url>https://management.core.windows.net/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/services/hostedservices/xplattestvm</Url><ServiceName>xplattestvm</ServiceName><HostedServiceProperties><Description>Implicitly created hosted service</Description><AffinityGroup>RubyT</AffinityGroup><Label>Y2xpdGVzdHZtMTcwOQ==</Label><Status>Created</Status><DateCreated>2014-07-21T08:50:19Z</DateCreated><DateLastModified>2014-07-21T08:50:36Z</DateLastModified><ExtendedProperties/></HostedServiceProperties><ComputeCapabilities><WebWorkerRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></WebWorkerRoleSizes><VirtualMachinesRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>Basic_A0</RoleSize><RoleSize>Basic_A1</RoleSize><RoleSize>Basic_A2</RoleSize><RoleSize>Basic_A3</RoleSize><RoleSize>Basic_A4</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></VirtualMachinesRoleSizes></ComputeCapabilities></HostedService></HostedServices>", {
          'cache-control': 'no-cache',
          'content-length': '23679',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '99553627160bc04f8d34259cb700f419',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deploymentslots/Production')
        .reply(200, "<Deployment xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><Name>xplattestvm</Name><DeploymentSlot>Production</DeploymentSlot><PrivateID>aae92bb928294344b496087b97918b0b</PrivateID><Status>Running</Status><Label>WTJ4cGRHVnpkSFp0TVRjd09RPT0=</Label><Url>http://xplattestvm.cloudapp.net/</Url><Configuration>PFNlcnZpY2VDb25maWd1cmF0aW9uIHhtbG5zOnhzZD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEiIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL1NlcnZpY2VIb3N0aW5nLzIwMDgvMTAvU2VydmljZUNvbmZpZ3VyYXRpb24iPg0KICA8Um9sZSBuYW1lPSJjbGl0ZXN0dm0xNzA5Ij4NCiAgICA8SW5zdGFuY2VzIGNvdW50PSIxIiAvPg0KICA8L1JvbGU+DQo8L1NlcnZpY2VDb25maWd1cmF0aW9uPg==</Configuration><RoleInstanceList><RoleInstance><RoleName>xplattestvm</RoleName><InstanceName>xplattestvm</InstanceName><InstanceStatus>ReadyRole</InstanceStatus><InstanceUpgradeDomain>0</InstanceUpgradeDomain><InstanceFaultDomain>0</InstanceFaultDomain><InstanceSize>Small</InstanceSize><InstanceStateDetails/><IpAddress>172.16.0.10</IpAddress><PowerState>Started</PowerState><HostName>xplattestvm</HostName><RemoteAccessCertificateThumbprint>51345D447C2D493E1095D78BDC2F1BA6C379BDD7</RemoteAccessCertificateThumbprint><GuestAgentStatus><ProtocolVersion>1.0</ProtocolVersion><Timestamp>2014-07-21T08:58:09Z</Timestamp><GuestAgentVersion>Unknown</GuestAgentVersion><Status>NotReady</Status><FormattedMessage><Language>en-US</Language><Message>Status not available for role xplattestvm.</Message></FormattedMessage></GuestAgentStatus></RoleInstance></RoleInstanceList><UpgradeDomainCount>1</UpgradeDomainCount><RoleList><Role i:type=\"PersistentVMRole\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet i:type=\"PersistentVMRole\"><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.10</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></Role></RoleList><SdkVersion/><Locked>false</Locked><RollbackAllowed>false</RollbackAllowed><VirtualNetworkName>5abcd</VirtualNetworkName><CreatedTime>2014-07-21T08:50:40Z</CreatedTime><LastModifiedTime>2014-07-21T08:58:07Z</LastModifiedTime><ExtendedProperties/><PersistentVMDowntime><StartTime>2014-06-20T23:33:34Z</StartTime><EndTime>2014-06-22T23:33:34Z</EndTime><Status>PersistentVMUpdateCompleted</Status></PersistentVMDowntime><VirtualIPs><VirtualIP><Address>137.116.139.130</Address><IsDnsProgrammed>true</IsDnsProgrammed><Name>__PseudoBackEndContractVip</Name></VirtualIP></VirtualIPs><InternalDnsSuffix>xplattestvm.i4.internal.cloudapp.net</InternalDnsSuffix><LoadBalancers/></Deployment>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/virtualnetwork')
        .reply(200, "<VirtualNetworkSites><VirtualNetworkSite><Name>5abcd</Name><Id>456b1f19-212f-47a0-85e2-032504975642</Id><AffinityGroup>RubyT</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.10/12</AddressPrefix><AddressPrefix>10.0.0.0/8</AddressPrefix><AddressPrefix>192.168.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/12</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns></VirtualNetworkSite><VirtualNetworkSite><Name>mynetwork</Name><Id>386452bd-5cef-4eea-a889-a6e5d0635381</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.4.0.0/16</AddressPrefix><AddressPrefix>10.1.0.0/16</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.4.2.0/19</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.4.32.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>ne@@wvnet$$%10</Name><Id>c27720fe-1c7c-429b-85ec-09cf605307e2</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>new_network</Name><Id>69d6faab-d75c-43c4-a41a-20c36040f0c5</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>newvnet$$%10</Name><Id>1e045b27-4b5a-42f6-8399-23a85df51702</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>testy</Name><Id>06bb8c56-83da-499e-8585-2609db606247</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.11/8</AddressPrefix><AddressPrefix>172.16.77.0/12</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.0.0.0/11</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.32.0.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>Vnet</Name><Id>a9001b93-75cc-4580-94b4-a200654da28e</Id><AffinityGroup>EastAsia</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.0/28</AddressPrefix><AddressPrefix>192.168.29.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/29</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>172.16.0.8/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>XplatNetWest</Name><Id>b2f72f3b-db23-4c7e-8255-89215463ab45</Id><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/19</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/22</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite><VirtualNetworkSite><Name>XplatVnet</Name><Id>2831c826-01f1-47e2-8026-aab52acebf48</Id><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/20</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/23</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite></VirtualNetworkSites>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deployments/xplattestvm/roles/xplattestvm')
        .reply(200, "<PersistentVMRole xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet ><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.10</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></PersistentVMRole>", {
          'cache-control': 'no-cache',
          'content-length': '1045',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '0cfa970720d5ca788483658d52b4456d',
          date: 'Mon, 21 Jul 2014 08:58:28 GMT'
        });
      return result;
    },
    function(nock) {
      var result = nock('https://management.core.windows.net:443')
        .filteringRequestBody(function(path) {
          return '*';
        })
        .put('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deployments/xplattestvm/roles/xplattestvm', '*')
        .reply(202, "", {
          'cache-control': 'no-cache',
          'content-length': '0',
          server: '1.0.6198.27 (rd_rdfe_stable.131122-1638) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth',
          'x-ms-request-id': 'a7be9dfaad173db1b22898769753b420',
          date: 'Mon, 25 Nov 2013 11:08:48 GMT'
        });
      return result;
    },

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/operations/a7be9dfaad173db1b22898769753b420')
        .reply(200, "<Operation xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><ID>2a0cea8c-90f0-c882-a218-3ae8b51e073f</ID><Status>Succeeded</Status><HttpStatusCode>200</HttpStatusCode></Operation>", {
          'cache-control': 'no-cache',
          'content-length': '232',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'c7425fdb2745c0d9afcfdee7a63a6e86',
          date: 'Mon, 21 Jul 2014 08:59:00 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices')
        .reply(200, "<HostedServices xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><HostedService><Url>https://management.core.windows.net/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/services/hostedservices/xplattestvm</Url><ServiceName>xplattestvm</ServiceName><HostedServiceProperties><Description>Implicitly created hosted service</Description><AffinityGroup>RubyT</AffinityGroup><Label>Y2xpdGVzdHZtMTcwOQ==</Label><Status>Created</Status><DateCreated>2014-07-21T08:50:19Z</DateCreated><DateLastModified>2014-07-21T08:50:36Z</DateLastModified><ExtendedProperties/></HostedServiceProperties><ComputeCapabilities><WebWorkerRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></WebWorkerRoleSizes><VirtualMachinesRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>Basic_A0</RoleSize><RoleSize>Basic_A1</RoleSize><RoleSize>Basic_A2</RoleSize><RoleSize>Basic_A3</RoleSize><RoleSize>Basic_A4</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></VirtualMachinesRoleSizes></ComputeCapabilities></HostedService></HostedServices>", {
          'cache-control': 'no-cache',
          'content-length': '23679',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '99553627160bc04f8d34259cb700f419',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deploymentslots/Production')
        .reply(200, "<Deployment xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><Name>xplattestvm</Name><DeploymentSlot>Production</DeploymentSlot><PrivateID>aae92bb928294344b496087b97918b0b</PrivateID><Status>Running</Status><Label>WTJ4cGRHVnpkSFp0TVRjd09RPT0=</Label><Url>http://xplattestvm.cloudapp.net/</Url><Configuration>PFNlcnZpY2VDb25maWd1cmF0aW9uIHhtbG5zOnhzZD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEiIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL1NlcnZpY2VIb3N0aW5nLzIwMDgvMTAvU2VydmljZUNvbmZpZ3VyYXRpb24iPg0KICA8Um9sZSBuYW1lPSJjbGl0ZXN0dm0xNzA5Ij4NCiAgICA8SW5zdGFuY2VzIGNvdW50PSIxIiAvPg0KICA8L1JvbGU+DQo8L1NlcnZpY2VDb25maWd1cmF0aW9uPg==</Configuration><RoleInstanceList><RoleInstance><RoleName>xplattestvm</RoleName><InstanceName>xplattestvm</InstanceName><InstanceStatus>ReadyRole</InstanceStatus><InstanceUpgradeDomain>0</InstanceUpgradeDomain><InstanceFaultDomain>0</InstanceFaultDomain><InstanceSize>Small</InstanceSize><InstanceStateDetails/><IpAddress>172.16.0.12</IpAddress><PowerState>Started</PowerState><HostName>xplattestvm</HostName><RemoteAccessCertificateThumbprint>51345D447C2D493E1095D78BDC2F1BA6C379BDD7</RemoteAccessCertificateThumbprint><GuestAgentStatus><ProtocolVersion>1.0</ProtocolVersion><Timestamp>2014-07-21T08:58:09Z</Timestamp><GuestAgentVersion>Unknown</GuestAgentVersion><Status>NotReady</Status><FormattedMessage><Language>en-US</Language><Message>Status not available for role xplattestvm.</Message></FormattedMessage></GuestAgentStatus></RoleInstance></RoleInstanceList><UpgradeDomainCount>1</UpgradeDomainCount><RoleList><Role i:type=\"PersistentVMRole\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet i:type=\"PersistentVMRole\"><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.12</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></Role></RoleList><SdkVersion/><Locked>false</Locked><RollbackAllowed>false</RollbackAllowed><VirtualNetworkName>5abcd</VirtualNetworkName><CreatedTime>2014-07-21T08:50:40Z</CreatedTime><LastModifiedTime>2014-07-21T08:58:07Z</LastModifiedTime><ExtendedProperties/><PersistentVMDowntime><StartTime>2014-06-20T23:33:34Z</StartTime><EndTime>2014-06-22T23:33:34Z</EndTime><Status>PersistentVMUpdateCompleted</Status></PersistentVMDowntime><VirtualIPs><VirtualIP><Address>137.116.139.130</Address><IsDnsProgrammed>true</IsDnsProgrammed><Name>__PseudoBackEndContractVip</Name></VirtualIP></VirtualIPs><InternalDnsSuffix>xplattestvm.i4.internal.cloudapp.net</InternalDnsSuffix><LoadBalancers/></Deployment>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    }

  ],

  [

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/virtualnetwork')
        .reply(200, "<VirtualNetworkSites xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><VirtualNetworkSite><Name>5abcd</Name><Id>456b1f19-212f-47a0-85e2-032504975642</Id><AffinityGroup>RubyT</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.10/12</AddressPrefix><AddressPrefix>10.0.0.0/8</AddressPrefix><AddressPrefix>192.168.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/12</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns></VirtualNetworkSite><VirtualNetworkSite><Name>mynetwork</Name><Id>386452bd-5cef-4eea-a889-a6e5d0635381</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.4.0.0/16</AddressPrefix><AddressPrefix>10.1.0.0/16</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.4.2.0/19</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.4.32.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>ne@@wvnet$$%10</Name><Id>c27720fe-1c7c-429b-85ec-09cf605307e2</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>new_network</Name><Id>69d6faab-d75c-43c4-a41a-20c36040f0c5</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>newvnet$$%10</Name><Id>1e045b27-4b5a-42f6-8399-23a85df51702</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>testy</Name><Id>06bb8c56-83da-499e-8585-2609db606247</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.11/8</AddressPrefix><AddressPrefix>172.16.77.0/12</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.0.0.0/11</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.32.0.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>Vnet</Name><Id>a9001b93-75cc-4580-94b4-a200654da28e</Id><AffinityGroup>EastAsia</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.0/28</AddressPrefix><AddressPrefix>192.168.29.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/29</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>172.16.0.8/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>XplatNetWest</Name><Id>b2f72f3b-db23-4c7e-8255-89215463ab45</Id><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/19</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/22</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite><VirtualNetworkSite><Name>XplatVnet</Name><Id>2831c826-01f1-47e2-8026-aab52acebf48</Id><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/20</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/23</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite></VirtualNetworkSites>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '6604610909e3cdc09a13fd1e7343b80d',
          date: 'Mon, 21 Jul 2014 10:56:33 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/5abcd?op=checkavailability&address=172.16.0.12')
        .reply(200, "<AddressAvailabilityResponse xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><IsAvailable>false</IsAvailable><AvailableAddresses><AvailableAddress>172.16.0.4</AvailableAddress><AvailableAddress>172.16.0.5</AvailableAddress><AvailableAddress>172.16.0.6</AvailableAddress><AvailableAddress>172.16.0.7</AvailableAddress><AvailableAddress>172.16.0.8</AvailableAddress></AvailableAddresses></AddressAvailabilityResponse>", {
          'cache-control': 'no-cache',
          'content-length': '469',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '63aff22d5907c94b85c58bfae1fcf298',
          date: 'Mon, 21 Jul 2014 10:56:35 GMT'
        });
      return result;
    }

  ],

  [

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/virtualnetwork')
        .reply(200, "<VirtualNetworkSites><VirtualNetworkSite><Name>5abcd</Name><Id>456b1f19-212f-47a0-85e2-032504975642</Id><AffinityGroup>RubyT</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.10/12</AddressPrefix><AddressPrefix>10.0.0.0/8</AddressPrefix><AddressPrefix>192.168.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/12</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns></VirtualNetworkSite><VirtualNetworkSite><Name>mynetwork</Name><Id>386452bd-5cef-4eea-a889-a6e5d0635381</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.4.0.0/16</AddressPrefix><AddressPrefix>10.1.0.0/16</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.4.2.0/19</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.4.32.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>ne@@wvnet$$%10</Name><Id>c27720fe-1c7c-429b-85ec-09cf605307e2</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>new_network</Name><Id>69d6faab-d75c-43c4-a41a-20c36040f0c5</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>newvnet$$%10</Name><Id>1e045b27-4b5a-42f6-8399-23a85df51702</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>testy</Name><Id>06bb8c56-83da-499e-8585-2609db606247</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.11/8</AddressPrefix><AddressPrefix>172.16.77.0/12</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.0.0.0/11</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.32.0.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>Vnet</Name><Id>a9001b93-75cc-4580-94b4-a200654da28e</Id><AffinityGroup>EastAsia</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.0/28</AddressPrefix><AddressPrefix>192.168.29.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/29</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>172.16.0.8/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>XplatNetWest</Name><Id>b2f72f3b-db23-4c7e-8255-89215463ab45</Id><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/19</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/22</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite><VirtualNetworkSite><Name>XplatVnet</Name><Id>2831c826-01f1-47e2-8026-aab52acebf48</Id><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/20</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/23</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite></VirtualNetworkSites>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices')
        .reply(200, "<HostedServices xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><HostedService><Url>https://management.core.windows.net/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/services/hostedservices/xplattestvm</Url><ServiceName>xplattestvm</ServiceName><HostedServiceProperties><Description>Implicitly created hosted service</Description><AffinityGroup>RubyT</AffinityGroup><Label>Y2xpdGVzdHZtMTcwOQ==</Label><Status>Created</Status><DateCreated>2014-07-21T08:50:19Z</DateCreated><DateLastModified>2014-07-21T08:50:36Z</DateLastModified><ExtendedProperties/></HostedServiceProperties><ComputeCapabilities><WebWorkerRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></WebWorkerRoleSizes><VirtualMachinesRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>Basic_A0</RoleSize><RoleSize>Basic_A1</RoleSize><RoleSize>Basic_A2</RoleSize><RoleSize>Basic_A3</RoleSize><RoleSize>Basic_A4</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></VirtualMachinesRoleSizes></ComputeCapabilities></HostedService></HostedServices>", {
          'cache-control': 'no-cache',
          'content-length': '23679',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '99553627160bc04f8d34259cb700f419',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deploymentslots/Production')
        .reply(200, "<Deployment xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><Name>xplattestvm</Name><DeploymentSlot>Production</DeploymentSlot><PrivateID>aae92bb928294344b496087b97918b0b</PrivateID><Status>Running</Status><Label>WTJ4cGRHVnpkSFp0TVRjd09RPT0=</Label><Url>http://xplattestvm.cloudapp.net/</Url><Configuration>PFNlcnZpY2VDb25maWd1cmF0aW9uIHhtbG5zOnhzZD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEiIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL1NlcnZpY2VIb3N0aW5nLzIwMDgvMTAvU2VydmljZUNvbmZpZ3VyYXRpb24iPg0KICA8Um9sZSBuYW1lPSJjbGl0ZXN0dm0xNzA5Ij4NCiAgICA8SW5zdGFuY2VzIGNvdW50PSIxIiAvPg0KICA8L1JvbGU+DQo8L1NlcnZpY2VDb25maWd1cmF0aW9uPg==</Configuration><RoleInstanceList><RoleInstance><RoleName>xplattestvm</RoleName><InstanceName>xplattestvm</InstanceName><InstanceStatus>ReadyRole</InstanceStatus><InstanceUpgradeDomain>0</InstanceUpgradeDomain><InstanceFaultDomain>0</InstanceFaultDomain><InstanceSize>Small</InstanceSize><InstanceStateDetails/><IpAddress>172.16.0.12</IpAddress><PowerState>Started</PowerState><HostName>xplattestvm</HostName><RemoteAccessCertificateThumbprint>51345D447C2D493E1095D78BDC2F1BA6C379BDD7</RemoteAccessCertificateThumbprint><GuestAgentStatus><ProtocolVersion>1.0</ProtocolVersion><Timestamp>2014-07-21T08:58:09Z</Timestamp><GuestAgentVersion>Unknown</GuestAgentVersion><Status>NotReady</Status><FormattedMessage><Language>en-US</Language><Message>Status not available for role xplattestvm.</Message></FormattedMessage></GuestAgentStatus></RoleInstance></RoleInstanceList><UpgradeDomainCount>1</UpgradeDomainCount><RoleList><Role i:type=\"PersistentVMRole\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet i:type=\"PersistentVMRole\"><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.12</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></Role></RoleList><SdkVersion/><Locked>false</Locked><RollbackAllowed>false</RollbackAllowed><VirtualNetworkName>5abcd</VirtualNetworkName><CreatedTime>2014-07-21T08:50:40Z</CreatedTime><LastModifiedTime>2014-07-21T08:58:07Z</LastModifiedTime><ExtendedProperties/><PersistentVMDowntime><StartTime>2014-06-20T23:33:34Z</StartTime><EndTime>2014-06-22T23:33:34Z</EndTime><Status>PersistentVMUpdateCompleted</Status></PersistentVMDowntime><VirtualIPs><VirtualIP><Address>137.116.139.130</Address><IsDnsProgrammed>true</IsDnsProgrammed><Name>__PseudoBackEndContractVip</Name></VirtualIP></VirtualIPs><InternalDnsSuffix>xplattestvm.i4.internal.cloudapp.net</InternalDnsSuffix><LoadBalancers/></Deployment>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    }

  ],

  [

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices')
        .reply(200, "<HostedServices xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><HostedService><Url>https://management.core.windows.net/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/services/hostedservices/xplattestvm</Url><ServiceName>xplattestvm</ServiceName><HostedServiceProperties><Description>Implicitly created hosted service</Description><AffinityGroup>RubyT</AffinityGroup><Label>Y2xpdGVzdHZtMTcwOQ==</Label><Status>Created</Status><DateCreated>2014-07-21T08:50:19Z</DateCreated><DateLastModified>2014-07-21T08:50:36Z</DateLastModified><ExtendedProperties/></HostedServiceProperties><ComputeCapabilities><WebWorkerRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></WebWorkerRoleSizes><VirtualMachinesRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>Basic_A0</RoleSize><RoleSize>Basic_A1</RoleSize><RoleSize>Basic_A2</RoleSize><RoleSize>Basic_A3</RoleSize><RoleSize>Basic_A4</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></VirtualMachinesRoleSizes></ComputeCapabilities></HostedService></HostedServices>", {
          'cache-control': 'no-cache',
          'content-length': '23679',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '99553627160bc04f8d34259cb700f419',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deploymentslots/Production')
        .reply(200, "<Deployment xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><Name>xplattestvm</Name><DeploymentSlot>Production</DeploymentSlot><PrivateID>aae92bb928294344b496087b97918b0b</PrivateID><Status>Running</Status><Label>WTJ4cGRHVnpkSFp0TVRjd09RPT0=</Label><Url>http://xplattestvm.cloudapp.net/</Url><Configuration>PFNlcnZpY2VDb25maWd1cmF0aW9uIHhtbG5zOnhzZD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEiIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL1NlcnZpY2VIb3N0aW5nLzIwMDgvMTAvU2VydmljZUNvbmZpZ3VyYXRpb24iPg0KICA8Um9sZSBuYW1lPSJjbGl0ZXN0dm0xNzA5Ij4NCiAgICA8SW5zdGFuY2VzIGNvdW50PSIxIiAvPg0KICA8L1JvbGU+DQo8L1NlcnZpY2VDb25maWd1cmF0aW9uPg==</Configuration><RoleInstanceList><RoleInstance><RoleName>xplattestvm</RoleName><InstanceName>xplattestvm</InstanceName><InstanceStatus>ReadyRole</InstanceStatus><InstanceUpgradeDomain>0</InstanceUpgradeDomain><InstanceFaultDomain>0</InstanceFaultDomain><InstanceSize>Small</InstanceSize><InstanceStateDetails/><IpAddress>172.16.0.12</IpAddress><PowerState>Started</PowerState><HostName>xplattestvm</HostName><RemoteAccessCertificateThumbprint>51345D447C2D493E1095D78BDC2F1BA6C379BDD7</RemoteAccessCertificateThumbprint><GuestAgentStatus><ProtocolVersion>1.0</ProtocolVersion><Timestamp>2014-07-21T08:58:09Z</Timestamp><GuestAgentVersion>Unknown</GuestAgentVersion><Status>NotReady</Status><FormattedMessage><Language>en-US</Language><Message>Status not available for role xplattestvm.</Message></FormattedMessage></GuestAgentStatus></RoleInstance></RoleInstanceList><UpgradeDomainCount>1</UpgradeDomainCount><RoleList><Role i:type=\"PersistentVMRole\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet i:type=\"PersistentVMRole\"><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.12</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></Role></RoleList><SdkVersion/><Locked>false</Locked><RollbackAllowed>false</RollbackAllowed><VirtualNetworkName>5abcd</VirtualNetworkName><CreatedTime>2014-07-21T08:50:40Z</CreatedTime><LastModifiedTime>2014-07-21T08:58:07Z</LastModifiedTime><ExtendedProperties/><PersistentVMDowntime><StartTime>2014-06-20T23:33:34Z</StartTime><EndTime>2014-06-22T23:33:34Z</EndTime><Status>PersistentVMUpdateCompleted</Status></PersistentVMDowntime><VirtualIPs><VirtualIP><Address>137.116.139.130</Address><IsDnsProgrammed>true</IsDnsProgrammed><Name>__PseudoBackEndContractVip</Name></VirtualIP></VirtualIPs><InternalDnsSuffix>xplattestvm.i4.internal.cloudapp.net</InternalDnsSuffix><LoadBalancers/></Deployment>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deployments/xplattestvm/roles/xplattestvm')
        .reply(200, "<PersistentVMRole xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet ><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.10</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></PersistentVMRole>", {
          'cache-control': 'no-cache',
          'content-length': '1045',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '0cfa970720d5ca788483658d52b4456d',
          date: 'Mon, 21 Jul 2014 08:58:28 GMT'
        });
      return result;
    },
    function(nock) {
      var result = nock('https://management.core.windows.net:443')
        .filteringRequestBody(function(path) {
          return '*';
        })
        .put('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deployments/xplattestvm/roles/xplattestvm', '*')
        .reply(202, "", {
          'cache-control': 'no-cache',
          'content-length': '0',
          server: '1.0.6198.27 (rd_rdfe_stable.131122-1638) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth',
          'x-ms-request-id': 'a7be9dfaad173db1b22898769753b420',
          date: 'Mon, 25 Nov 2013 11:08:48 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/operations/a7be9dfaad173db1b22898769753b420')
        .reply(200, "<Operation xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><ID>2a0cea8c-90f0-c882-a218-3ae8b51e073f</ID><Status>Succeeded</Status><HttpStatusCode>200</HttpStatusCode></Operation>", {
          'cache-control': 'no-cache',
          'content-length': '232',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'c7425fdb2745c0d9afcfdee7a63a6e86',
          date: 'Mon, 21 Jul 2014 08:59:00 GMT'
        });
      return result;
    }

  ],

  //VM Vnet
  [

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/virtualnetwork')
        .reply(200, "<VirtualNetworkSites><VirtualNetworkSite><Name>5abcd</Name><Id>456b1f19-212f-47a0-85e2-032504975642</Id><AffinityGroup>RubyT</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.10/12</AddressPrefix><AddressPrefix>10.0.0.0/8</AddressPrefix><AddressPrefix>192.168.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/12</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns></VirtualNetworkSite><VirtualNetworkSite><Name>mynetwork</Name><Id>386452bd-5cef-4eea-a889-a6e5d0635381</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.4.0.0/16</AddressPrefix><AddressPrefix>10.1.0.0/16</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.4.2.0/19</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.4.32.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>ne@@wvnet$$%10</Name><Id>c27720fe-1c7c-429b-85ec-09cf605307e2</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>new_network</Name><Id>69d6faab-d75c-43c4-a41a-20c36040f0c5</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>newvnet$$%10</Name><Id>1e045b27-4b5a-42f6-8399-23a85df51702</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>testy</Name><Id>06bb8c56-83da-499e-8585-2609db606247</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.11/8</AddressPrefix><AddressPrefix>172.16.77.0/12</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.0.0.0/11</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.32.0.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>Vnet</Name><Id>a9001b93-75cc-4580-94b4-a200654da28e</Id><AffinityGroup>EastAsia</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.0/28</AddressPrefix><AddressPrefix>192.168.29.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/29</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>172.16.0.8/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>XplatNetWest</Name><Id>b2f72f3b-db23-4c7e-8255-89215463ab45</Id><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/19</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/22</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite><VirtualNetworkSite><Name>XplatVnet</Name><Id>2831c826-01f1-47e2-8026-aab52acebf48</Id><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/20</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/23</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite></VirtualNetworkSites>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices')
        .reply(200, "<HostedServices xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><HostedService><Url>https://management.core.windows.net/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/services/hostedservices/xplattestvm</Url><ServiceName>xplattestvm</ServiceName><HostedServiceProperties><Description>Implicitly created hosted service</Description><AffinityGroup>RubyT</AffinityGroup><Label>Y2xpdGVzdHZtMTcwOQ==</Label><Status>Created</Status><DateCreated>2014-07-21T08:50:19Z</DateCreated><DateLastModified>2014-07-21T08:50:36Z</DateLastModified><ExtendedProperties/></HostedServiceProperties><ComputeCapabilities><WebWorkerRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></WebWorkerRoleSizes><VirtualMachinesRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>Basic_A0</RoleSize><RoleSize>Basic_A1</RoleSize><RoleSize>Basic_A2</RoleSize><RoleSize>Basic_A3</RoleSize><RoleSize>Basic_A4</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></VirtualMachinesRoleSizes></ComputeCapabilities></HostedService></HostedServices>", {
          'cache-control': 'no-cache',
          'content-length': '23679',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '99553627160bc04f8d34259cb700f419',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deploymentslots/Production')
        .reply(200, "<Deployment xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><Name>xplattestvm</Name><DeploymentSlot>Production</DeploymentSlot><PrivateID>aae92bb928294344b496087b97918b0b</PrivateID><Status>Running</Status><Label>WTJ4cGRHVnpkSFp0TVRjd09RPT0=</Label><Url>http://xplattestvm.cloudapp.net/</Url><Configuration>PFNlcnZpY2VDb25maWd1cmF0aW9uIHhtbG5zOnhzZD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEiIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL1NlcnZpY2VIb3N0aW5nLzIwMDgvMTAvU2VydmljZUNvbmZpZ3VyYXRpb24iPg0KICA8Um9sZSBuYW1lPSJjbGl0ZXN0dm0xNzA5Ij4NCiAgICA8SW5zdGFuY2VzIGNvdW50PSIxIiAvPg0KICA8L1JvbGU+DQo8L1NlcnZpY2VDb25maWd1cmF0aW9uPg==</Configuration><RoleInstanceList><RoleInstance><RoleName>xplattestvm</RoleName><InstanceName>xplattestvm</InstanceName><InstanceStatus>ReadyRole</InstanceStatus><InstanceUpgradeDomain>0</InstanceUpgradeDomain><InstanceFaultDomain>0</InstanceFaultDomain><InstanceSize>Small</InstanceSize><InstanceStateDetails/><IpAddress>172.16.0.12</IpAddress><PowerState>Started</PowerState><HostName>xplattestvm</HostName><RemoteAccessCertificateThumbprint>51345D447C2D493E1095D78BDC2F1BA6C379BDD7</RemoteAccessCertificateThumbprint><GuestAgentStatus><ProtocolVersion>1.0</ProtocolVersion><Timestamp>2014-07-21T08:58:09Z</Timestamp><GuestAgentVersion>Unknown</GuestAgentVersion><Status>NotReady</Status><FormattedMessage><Language>en-US</Language><Message>Status not available for role xplattestvm.</Message></FormattedMessage></GuestAgentStatus></RoleInstance></RoleInstanceList><UpgradeDomainCount>1</UpgradeDomainCount><RoleList><Role i:type=\"PersistentVMRole\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet i:type=\"PersistentVMRole\"><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.12</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></Role></RoleList><SdkVersion/><Locked>false</Locked><RollbackAllowed>false</RollbackAllowed><VirtualNetworkName>5abcd</VirtualNetworkName><CreatedTime>2014-07-21T08:50:40Z</CreatedTime><LastModifiedTime>2014-07-21T08:58:07Z</LastModifiedTime><ExtendedProperties/><PersistentVMDowntime><StartTime>2014-06-20T23:33:34Z</StartTime><EndTime>2014-06-22T23:33:34Z</EndTime><Status>PersistentVMUpdateCompleted</Status></PersistentVMDowntime><VirtualIPs><VirtualIP><Address>137.116.139.130</Address><IsDnsProgrammed>true</IsDnsProgrammed><Name>__PseudoBackEndContractVip</Name></VirtualIP></VirtualIPs><InternalDnsSuffix>xplattestvm.i4.internal.cloudapp.net</InternalDnsSuffix><LoadBalancers/></Deployment>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    }

  ],
  [

    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/networking/virtualnetwork')
        .reply(200, "<VirtualNetworkSites><VirtualNetworkSite><Name>5abcd</Name><Id>456b1f19-212f-47a0-85e2-032504975642</Id><AffinityGroup>RubyT</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.10/12</AddressPrefix><AddressPrefix>10.0.0.0/8</AddressPrefix><AddressPrefix>192.168.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/12</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns></VirtualNetworkSite><VirtualNetworkSite><Name>mynetwork</Name><Id>386452bd-5cef-4eea-a889-a6e5d0635381</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.4.0.0/16</AddressPrefix><AddressPrefix>10.1.0.0/16</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.4.2.0/19</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.4.32.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>ne@@wvnet$$%10</Name><Id>c27720fe-1c7c-429b-85ec-09cf605307e2</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>new_network</Name><Id>69d6faab-d75c-43c4-a41a-20c36040f0c5</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>newvnet$$%10</Name><Id>1e045b27-4b5a-42f6-8399-23a85df51702</Id><AffinityGroup>NewAffinityGroup01</AffinityGroup><State>Creating</State><AddressSpace><AddressPrefixes><AddressPrefix>10.0.8.7/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets/></VirtualNetworkSite><VirtualNetworkSite><Name>testy</Name><Id>06bb8c56-83da-499e-8585-2609db606247</Id><AffinityGroup>affinity1</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>10.0.0.11/8</AddressPrefix><AddressPrefix>172.16.77.0/12</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>10.0.0.0/11</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>10.32.0.0/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>Vnet</Name><Id>a9001b93-75cc-4580-94b4-a200654da28e</Id><AffinityGroup>EastAsia</AffinityGroup><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>172.16.0.0/28</AddressPrefix><AddressPrefix>192.168.29.0/24</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>172.16.0.0/29</AddressPrefix></Subnet><Subnet><Name>GatewaySubnet</Name><AddressPrefix>172.16.0.8/29</AddressPrefix></Subnet></Subnets></VirtualNetworkSite><VirtualNetworkSite><Name>XplatNetWest</Name><Id>b2f72f3b-db23-4c7e-8255-89215463ab45</Id><State>Created</State><InUse>true</InUse><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/19</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/22</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite><VirtualNetworkSite><Name>XplatVnet</Name><Id>2831c826-01f1-47e2-8026-aab52acebf48</Id><State>Created</State><AddressSpace><AddressPrefixes><AddressPrefix>192.168.0.0/20</AddressPrefix></AddressPrefixes></AddressSpace><Subnets><Subnet><Name>Subnet-1</Name><AddressPrefix>192.168.0.0/23</AddressPrefix></Subnet></Subnets><Dns><DnsServers><DnsServer><Name>demodns</Name><Address>172.16.77.66</Address></DnsServer></DnsServers></Dns><Location>West US</Location></VirtualNetworkSite></VirtualNetworkSites>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices')
        .reply(200, "<HostedServices xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><HostedService><Url>https://management.core.windows.net/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/services/hostedservices/xplattestvm</Url><ServiceName>xplattestvm</ServiceName><HostedServiceProperties><Description>Implicitly created hosted service</Description><AffinityGroup>RubyT</AffinityGroup><Label>Y2xpdGVzdHZtMTcwOQ==</Label><Status>Created</Status><DateCreated>2014-07-21T08:50:19Z</DateCreated><DateLastModified>2014-07-21T08:50:36Z</DateLastModified><ExtendedProperties/></HostedServiceProperties><ComputeCapabilities><WebWorkerRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></WebWorkerRoleSizes><VirtualMachinesRoleSizes><RoleSize>A5</RoleSize><RoleSize>A6</RoleSize><RoleSize>A7</RoleSize><RoleSize>Basic_A0</RoleSize><RoleSize>Basic_A1</RoleSize><RoleSize>Basic_A2</RoleSize><RoleSize>Basic_A3</RoleSize><RoleSize>Basic_A4</RoleSize><RoleSize>ExtraLarge</RoleSize><RoleSize>ExtraSmall</RoleSize><RoleSize>Large</RoleSize><RoleSize>Medium</RoleSize><RoleSize>Small</RoleSize></VirtualMachinesRoleSizes></ComputeCapabilities></HostedService></HostedServices>", {
          'cache-control': 'no-cache',
          'content-length': '23679',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': '99553627160bc04f8d34259cb700f419',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    },
    function(nock) {
      var result =
        nock('https://management.core.windows.net')
        .get('/db1ab6f0-4769-4b27-930e-01e2ef9c123c/services/hostedservices/xplattestvm/deploymentslots/Production')
        .reply(200, "<Deployment xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><Name>xplattestvm</Name><DeploymentSlot>Production</DeploymentSlot><PrivateID>aae92bb928294344b496087b97918b0b</PrivateID><Status>Running</Status><Label>WTJ4cGRHVnpkSFp0TVRjd09RPT0=</Label><Url>http://xplattestvm.cloudapp.net/</Url><Configuration>PFNlcnZpY2VDb25maWd1cmF0aW9uIHhtbG5zOnhzZD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEiIHhtbG5zOnhzaT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL1NlcnZpY2VIb3N0aW5nLzIwMDgvMTAvU2VydmljZUNvbmZpZ3VyYXRpb24iPg0KICA8Um9sZSBuYW1lPSJjbGl0ZXN0dm0xNzA5Ij4NCiAgICA8SW5zdGFuY2VzIGNvdW50PSIxIiAvPg0KICA8L1JvbGU+DQo8L1NlcnZpY2VDb25maWd1cmF0aW9uPg==</Configuration><RoleInstanceList><RoleInstance><RoleName>xplattestvm</RoleName><InstanceName>xplattestvm</InstanceName><InstanceStatus>ReadyRole</InstanceStatus><InstanceUpgradeDomain>0</InstanceUpgradeDomain><InstanceFaultDomain>0</InstanceFaultDomain><InstanceSize>Small</InstanceSize><InstanceStateDetails/><IpAddress>172.16.0.12</IpAddress><PowerState>Started</PowerState><HostName>xplattestvm</HostName><RemoteAccessCertificateThumbprint>51345D447C2D493E1095D78BDC2F1BA6C379BDD7</RemoteAccessCertificateThumbprint><GuestAgentStatus><ProtocolVersion>1.0</ProtocolVersion><Timestamp>2014-07-21T08:58:09Z</Timestamp><GuestAgentVersion>Unknown</GuestAgentVersion><Status>NotReady</Status><FormattedMessage><Language>en-US</Language><Message>Status not available for role xplattestvm.</Message></FormattedMessage></GuestAgentStatus></RoleInstance></RoleInstanceList><UpgradeDomainCount>1</UpgradeDomainCount><RoleList><Role i:type=\"PersistentVMRole\"><RoleName>xplattestvm</RoleName><OsVersion/><RoleType>PersistentVMRole</RoleType><ConfigurationSets><ConfigurationSet i:type=\"PersistentVMRole\"><ConfigurationSetType>NetworkConfiguration</ConfigurationSetType><SubnetNames><SubnetName>Subnet-1</SubnetName></SubnetNames><StaticVirtualNetworkIPAddress>172.16.0.12</StaticVirtualNetworkIPAddress></ConfigurationSet></ConfigurationSets><DataVirtualHardDisks/><OSVirtualHardDisk><HostCaching>ReadWrite</HostCaching><DiskName>xplattestvm-xplattestvm-0-201407210850510545</DiskName><MediaLink>https://clitestvm8180vnet1405072.blob.core.windows.net/vhd-store/xplattestvm-8ab10810b5ebc563.vhd</MediaLink><SourceImageName>03f55de797f546a1b29d1b8d66be687a__Visual-Studio-14-Professional-CTP-14.0.21901.1-AzureSDK-2.3-WS2012R2</SourceImageName><OS>Windows</OS></OSVirtualHardDisk><RoleSize>Small</RoleSize><ProvisionGuestAgent>true</ProvisionGuestAgent></Role></RoleList><SdkVersion/><Locked>false</Locked><RollbackAllowed>false</RollbackAllowed><VirtualNetworkName>5abcd</VirtualNetworkName><CreatedTime>2014-07-21T08:50:40Z</CreatedTime><LastModifiedTime>2014-07-21T08:58:07Z</LastModifiedTime><ExtendedProperties/><PersistentVMDowntime><StartTime>2014-06-20T23:33:34Z</StartTime><EndTime>2014-06-22T23:33:34Z</EndTime><Status>PersistentVMUpdateCompleted</Status></PersistentVMDowntime><VirtualIPs><VirtualIP><Address>137.116.139.130</Address><IsDnsProgrammed>true</IsDnsProgrammed><Name>__PseudoBackEndContractVip</Name></VirtualIP></VirtualIPs><InternalDnsSuffix>xplattestvm.i4.internal.cloudapp.net</InternalDnsSuffix><LoadBalancers/></Deployment>", {
          'cache-control': 'no-cache',
          'content-length': '4177',
          'content-type': 'application/xml; charset=utf-8',
          server: '1.0.6198.108 (rd_rdfe_stable.140717-0053) Microsoft-HTTPAPI/2.0',
          'x-ms-servedbyregion': 'ussouth2',
          'x-ms-request-id': 'ecbb31490f0dc9508e3602679b8904dc',
          date: 'Mon, 21 Jul 2014 08:58:24 GMT'
        });
      return result;
    }
  ]
]