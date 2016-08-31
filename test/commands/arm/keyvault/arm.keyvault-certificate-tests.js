/**
 * Copyright (c) Microsoft.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var should = require('should');

var path = require('path');
var util = require('util');
var fs = require('fs')

var CLITest = require('../../../framework/arm-cli-test');
var log = require('../../../framework/test-logger');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');
var profile = require('../../../../lib/util/profile');

var testPrefix = 'arm-cli-keyvault-tests';
var rgPrefix = 'xplatTestRg';
var vaultPrefix = 'xplatTestVault';
var certificatePrefix = 'xplatTestCertificate';
var certificateIssuerPrefix = 'xplatTestCertificateIssuer';
var knownNames = [];

var requiredEnvironment = [
  { requiresToken: true }, 
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' } 
];

var galleryTemplateName;
var galleryTemplateUrl;

describe('arm', function() {

  describe('keyvault-certificate', function() {
    
    var suite;
    var dnsUpdateWait;
    var testLocation;
    var testResourceGroup;
    var testVault;

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() { 
        dnsUpdateWait = suite.isPlayback() ? 0 : 5000;
        testLocation = process.env.AZURE_ARM_TEST_LOCATION;
        testLocation = testLocation.toLowerCase().replace(/ /g, '');
        testResourceGroup = suite.generateId(rgPrefix, knownNames);
        testVault = suite.generateId(vaultPrefix, knownNames);
        suite.execute('group create %s --location %s', testResourceGroup, testLocation, function(result) {          
          result.exitStatus.should.be.equal(0);
          suite.execute('keyvault create %s --resource-group %s --location %s --json', testVault, testResourceGroup, testLocation, function(result) {
            result.exitStatus.should.be.equal(0);
            setTimeout(done, dnsUpdateWait);
          });
        });      
      });
    });

    after(function(done) {
      suite.execute('group delete %s --quiet', testResourceGroup, function() {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('basic', function() {

      it('certificate import (pfx) and management commands should work', function(done) {

        var certificateName = suite.generateId(certificatePrefix, knownNames);
        var importCertificateContent = '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';
        var importCertificatePassword = '123';
        var importCertificatePolicy = '{ \"keyProperties\" : { \"exportable\" : true, \"keyType\" : \"RSA\", \"keySize\" : 2048, \"reuseKey\" : false }, \"secretProperties\" : { \"contentType\" : \"application/x-pkcs12\" }, \"issuerReference\" : { \"name\" : \"Self\" } }';
        var certificateId;
        importCertificateMustSucceed();

        function importCertificateMustSucceed() {
          suite.execute('keyvault certificate import %s %s --content %s --password %s --certificate-policy %s', testVault, certificateName, importCertificateContent, importCertificatePassword, importCertificatePolicy, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustSucceed();
          });
        }

        function showCertificateMustSucceed() {
          suite.execute('keyvault certificate show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificate = JSON.parse(result.text);
            certificate.should.have.property('id');
            certificateId = certificate.id;
            var subscription = profile.current.getSubscription();
            certificateId.should.include(util.format('https://%s%s/certificates/%s/', testVault.toLowerCase(), subscription.keyVaultDnsSuffix, certificateName));
            certificate.should.have.property('cer');
            listCertificatesMustSucceed();
          });
        }

        function listCertificatesMustSucceed() {
          suite.execute('keyvault certificate list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificateId.indexOf(certificate.id + '/') === 0;
            }).should.be.true;
            listCertificateVersionsMustSucceed();
          });
        }

        function listCertificateVersionsMustSucceed() {
          suite.execute('keyvault certificate list-versions %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificate.id === certificateId;
            }).should.be.true;
            deleteCertificateMustSucceed();
          });
        }

        function deleteCertificateMustSucceed() {
          suite.execute('keyvault certificate delete %s %s --quiet', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustFail();
          });
        }

        function showCertificateMustFail() {
          suite.execute('keyvault certificate show %s %s', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Certificate %s not found', certificateName));
            done();
          });
        }

      });

      it('certificate import (pem) and management commands should work', function(done) {

        var certificateName = suite.generateId(certificatePrefix, knownNames);
        var importCertificateContent =  '-----BEGIN CERTIFICATE-----' + '\n' +
          "MIIDgzCCAmugAwIBAgIJAI0lPxPb9gn+MA0GCSqGSIb3DQEBCwUAMFgxCzAJBgNV" + '\n' +
          "BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX" + '\n' +
          "aWRnaXRzIFB0eSBMdGQxETAPBgNVBAsMCEtleVZhdWx0MB4XDTE2MDcyNzA3MTUw" + '\n' +
          "M1oXDTE5MDQyMzA3MTUwM1owWDELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUt" + '\n' +
          "U3RhdGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDERMA8GA1UE" + '\n' +
          "CwwIS2V5VmF1bHQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC8EfNn" + '\n' +
          "B7zhuZKG7pfT4MK5iP/xQSIvVMybMu9rvYNyFIlMAms6y9CB4QQfNmRzJmNApPZq" + '\n' +
          "lSU+gnOrSHQ+WsaMJNMFjb3v+WFbgcueywFT+76b4JtSpBH780n2yJrPdshWesO+" + '\n' +
          "lz08CmbYXRZsjLF+//0A9boZaestMlkMeBqhwp4JTC4wEJG5EHOxDMy+u5cnGwGG" + '\n' +
          "pgY4Cf6jSzW+hOZZ4cprysN85wcjMNcbGdKzOVhrsam4szJF+IxXiU2JuU827gW8" + '\n' +
          "NKW0VMTYioorqWM4Q6l6A0NVyFssY5/V3IZ/R237CQJJPwsKiSm4caIcfY4SDpxT" + '\n' +
          "QHFj/o7rREd50/xDAgMBAAGjUDBOMB0GA1UdDgQWBBQfM9eQbF5DtRZ0CUcX0Ern" + '\n' +
          "0aGAizAfBgNVHSMEGDAWgBQfM9eQbF5DtRZ0CUcX0Ern0aGAizAMBgNVHRMEBTAD" + '\n' +
          "AQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBslxGQMw72AKhvl4khm2M+gLnWuoaVzzYQ" + '\n' +
          "Kq4YMyI5BW5nl5QO/849q5K0aLMzPllqcjt31enj2q82uwVU9CvO4A46xdZ+PJD1" + '\n' +
          "Nf7JIqxRQN5m9EzORBel0aFR6zdUqWK32tArjLz0k9W2xI7aQTfSWkWE3q61+i/r" + '\n' +
          "8XYIwky9rP/he1NcvSKWsuSdrLEtdkLGqtmSouEQxa+Q+7Ketfg/tjWutEaWnOK1" + '\n' +
          "rqKHfgZT2RNoeRnMx4HSejQJLrZHuvpCD//fYrK2UQ9jUaDz8863GPm/bn/807jP" + '\n' +
          "wNEtrNdYa26lM0YthIHIEPEdn6rgxIXOYMUBnIQvafpIq88DNKeT" + '\n' +
          "-----END CERTIFICATE-----" + '\n' +
          "-----BEGIN ENCRYPTED PRIVATE KEY-----" + '\n' +
          "MIIE6jAcBgoqhkiG9w0BDAEDMA4ECJiLClPM6t5JAgIIAASCBMigL+KlEA9fagX0" + '\n' +
          "PFhQBeFjDiebJbMuTfa9HcOVZEDyrqmGng2Lfz+TUa3ys/V86okbUp2N9MoGK7gx" + '\n' +
          "cPqdq7rnu563LT9wGhtn8mUn8Wul0FfV2K56wsBGehJ+MPmlEjs6OZR0nVdXkwAh" + '\n' +
          "dVIzH9eFdz8mhJZOZI61TQNKCKbCqsR7lslkL2VWrSFgnHCUj5bR/BLIA2oRpQZv" + '\n' +
          "nw0SeYFQWMRyXgKH4VWMqOlObXm/ELnVOr9dJVzvTG42DRaK5N8BA9NTMsK1+8m+" + '\n' +
          "enCg4iNI/s81MD8iIy/d7MmsJFh8WQoqzUZmOVxfqNHw0TPgDpbCpCWRNigkRoGS" + '\n' +
          "Rosc7MIlCPPangjPMFZg5QeMuUBrE01fSvJtZ52jSMkyloSfQzQJJb9Aam6q6Dzo" + '\n' +
          "uPCH32zz1GV/56yJoO8IefOMIujvXFZku/QNzKWiXnuSA+xjFZhGEGQToU5wLtHX" + '\n' +
          "eEhz1cF519c8CkM4Ll/UUHPWtb90vqO2+O2DLug9qUUnoQl7P0O3W2NpAoBCLxUO" + '\n' +
          "qrfSyLUosms7Eg1DIVo5pwxawPK8qk7gwLntATZc+aTSUR9Y1dn4vJ9j9GZWIu9J" + '\n' +
          "VKO616gDO7q8R1C3mT72k2oUuUG25TtZOxsl+Y3iJgEyp9N7jo/Rdx5KkcvvB8zt" + '\n' +
          "gPCh5diKDjbo3LxmYRt62heOLEPs2YDjKByn0Nikco3LqTnedJeXEH2mBc7x1VWE" + '\n' +
          "0qTV4xqOXL9F7000Mv1cJcE2E88fN6tDge1IpuJbs03Ij0OgpaFRfS57NciBthgm" + '\n' +
          "Bp3lREHYNVa4sqWHlUqakoNtc2H62t9nmpzFV7zXJkqKPPpanKV5Q9zOD0VKgcoF" + '\n' +
          "yAuMkhuPV4IfOEbG8iiZozayk2nfRrm4+nz7b31/5Him2MEce3wbUtmWR6OPdswr" + '\n' +
          "B6K58j8TGGzOAEDTdWc9yOf/auSIBVDw+23/TbrVD3xRWdesKa4sj7rMW+3VZ1mh" + '\n' +
          "3/ghyhVPtvFcUKrAjjBjkdeMl84m+P+KcV9Ov57bojKVQdKc7kHrkpi4F66s4Z/J" + '\n' +
          "ZvWHw4LyK4PRlRFzm8eKtXkYLFssxtTRYRydT4wh6VJaOQD2Ww1cPOc/D74Qr/ap" + '\n' +
          "wQu/fx1Guqk1artbE+BalJakMNKd5Cu2/MfWt8kEjNctGrAHeDmznk/TbvX2rEpv" + '\n' +
          "/P16WFcjB4bb1Nee96xfuGPUcHul3fG5TRmKJnaxWeg5FM4H4cP5jmeXyGNqdbDS" + '\n' +
          "rgqpXChenTBwS5JvAVgv8ZvxJxp4h8fLFlUOKuKUR95gB09nBGnwAtEM4zgjKkcC" + '\n' +
          "PcvDZ7YpzU40gx6QiCVb2UPtggiEp2WyIrpe8VfzK4C7pQGInLn3Rm4G7mEFacv5" + '\n' +
          "HlbGJO+2XIk3ibFJYTQvMFYc/ESeRSOw6TDoy1sg3+Yl5BXYC+90lCGR9JK/sBYs" + '\n' +
          "12eVEqxi8kmoNXJ4on0snfDuRDv/6bIIDpfPAKqZzbTq7h6wzIreoz3wx4Oa8A9V" + '\n' +
          "rtG8TOkCYaoJRYD5uV1lc6Ok3CpZrI7kTGAfvQNi+H0Obz+sSXGksNtfdwNUzUd6" + '\n' +
          "p4CXrZmc/r6o3j4biteWTURnRQqkh67QM5qHJhmXuWD82sjSKU16MM0KqPze/Tl+" + '\n' +
          "+Figx8pgk29H6LM+N9Y=" + '\n' +
          "-----END ENCRYPTED PRIVATE KEY-----";
        var importCertificatePassword = '1234';
        var importCertificatePolicy = '{ \"keyProperties\" : { \"exportable\" : true, \"keyType\" : \"RSA\", \"keySize\" : 2048, \"reuseKey\" : false }, \"secretProperties\" : { \"contentType\" : \"application/x-pem-file\" }, \"issuerReference\" : { \"name\" : \"Self\" } }';
        var certificateFile = 'cert.pem';
        fs.writeFileSync(certificateFile, importCertificateContent);

        var certificateId;
        importCertificateMustSucceed();

        function importCertificateMustSucceed() {
          suite.execute('keyvault certificate import %s %s --content-file %s --password %s --certificate-policy %s', testVault, certificateName, certificateFile, importCertificatePassword, importCertificatePolicy, function(result) {
            result.exitStatus.should.be.equal(0);
            fs.unlinkSync(certificateFile);
            showCertificateMustSucceed();
          });
        }

        function showCertificateMustSucceed() {
          suite.execute('keyvault certificate show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificate = JSON.parse(result.text);
            certificate.should.have.property('id');
            certificateId = certificate.id;
            var subscription = profile.current.getSubscription();
            certificateId.should.include(util.format('https://%s%s/certificates/%s/', testVault.toLowerCase(), subscription.keyVaultDnsSuffix, certificateName));
            certificate.should.have.property('cer');
            listCertificatesMustSucceed();
          });
        }

        function listCertificatesMustSucceed() {
          suite.execute('keyvault certificate list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificateId.indexOf(certificate.id + '/') === 0;
            }).should.be.true;
            listCertificateVersionsMustSucceed();
          });
        }

        function listCertificateVersionsMustSucceed() {
          suite.execute('keyvault certificate list-versions %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificate.id === certificateId;
            }).should.be.true;
            deleteCertificateMustSucceed();
          });
        }

        function deleteCertificateMustSucceed() {
          suite.execute('keyvault certificate delete %s %s --quiet', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustFail();
          });
        }

        function showCertificateMustFail() {
          suite.execute('keyvault certificate show %s %s', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Certificate %s not found', certificateName));
            done();
          });
        }

      });

      it('certificate (self-signed) create and management commands should work', function(done) {

        var certificateName = suite.generateId(certificatePrefix, knownNames);
        var certificatePolicy, certificatePolicyFile;
        var certificateOperation, certificateId;

        createSelfSignedCertificateMustSucceed();

        function createSelfSignedCertificateMustSucceed() {
          suite.execute('keyvault certificate policy create --issuer-name Self --subject-name CN=AZURE --secret-content-type application/x-pem-file --validity-in-months 24 --json', function(result) {
            result.exitStatus.should.be.equal(0);
            certificatePolicy = JSON.parse(result.text);
            certificatePolicyFile = 'policy.js';
            fs.writeFileSync(certificatePolicyFile, JSON.stringify(certificatePolicy));
            createCertificateMustSucceed();
          });
        }

        function createCertificateMustSucceed() {
          suite.execute('keyvault certificate create %s %s --certificate-policy-file %s --json', testVault, certificateName, certificatePolicyFile, function(result) {
            result.exitStatus.should.be.equal(0);
            certificateOperation = JSON.parse(result.text);
            fs.unlinkSync(certificatePolicyFile);

            // Wait 120 seconds for enrollment to complete.
            var start = new Date().getTime();
            while (new Date().getTime() < start + 120000);
            enrollCertificateMustSucceed();
          });
        }

        function enrollCertificateMustSucceed() {
          suite.execute('keyvault certificate operation show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            certificateOperation = JSON.parse(result.text);
            certificateOperation.status.should.be.equal("completed");
            showCertificateMustSucceed();
          });
        }

        function showCertificateMustSucceed() {
          suite.execute('keyvault certificate show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificate = JSON.parse(result.text);
            certificate.should.have.property('id');
            certificateId = certificate.id;
            var subscription = profile.current.getSubscription();
            certificateId.should.include(util.format('https://%s%s/certificates/%s/', testVault.toLowerCase(), subscription.keyVaultDnsSuffix, certificateName));
            certificate.should.have.property('cer');
            listCertificatesMustSucceed();
          });
        }

        function listCertificatesMustSucceed() {
          suite.execute('keyvault certificate list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificateId.indexOf(certificate.id + '/') === 0;
            }).should.be.true;
            listCertificateVersionsMustSucceed();
          });
        }

        function listCertificateVersionsMustSucceed() {
          suite.execute('keyvault certificate list-versions %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificate.id === certificateId;
            }).should.be.true;
            deleteCertificateMustSucceed();
          });
        }

        function deleteCertificateMustSucceed() {
          suite.execute('keyvault certificate delete %s %s --quiet', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustFail();
          });
        }

        function showCertificateMustFail() {
          suite.execute('keyvault certificate show %s %s', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Certificate %s not found', certificateName));
            done();
          });
        }

      });

      it('certificate (test provider based) create and management commands should work', function(done) {

        var certificateName = suite.generateId(certificatePrefix, knownNames);
        var certificateIssuerName = suite.generateId(certificateIssuerPrefix, knownNames);

        var certificateAdministrator, certificateAdministratorFile;
        var certificateOrganization, certificateOrganizationFile;
        var certificateIssuer;
        var certificatePolicy, certificatePolicyFile;
        var certificateOperation, certificateId;

        createIssuerBasedCertificateMustSucceed();

        function createIssuerBasedCertificateMustSucceed() {
          suite.execute('keyvault certificate administrator create --first-name John --last-name Doe --email-address john.doe@contoso.com --phone-number 5555555555 --json', function(result) {
            result.exitStatus.should.be.equal(0);
            certificateAdministrator = JSON.parse(result.text);
            certificateAdministratorFile = 'certificate-administrator.js';
            fs.writeFileSync(certificateAdministratorFile, JSON.stringify(certificateAdministrator));
            createCertificateOrganizationMustSucceed();
          });
        }

        function createCertificateOrganizationMustSucceed() {
          suite.execute('keyvault certificate organization create --id CONTOSO --certificate-administrator-file %s --json', certificateAdministratorFile, function(result) {
            result.exitStatus.should.be.equal(0);
            certificateOrganization = JSON.parse(result.text);
            certificateOrganizationFile = 'certificate-organization.js';
            fs.writeFileSync(certificateOrganizationFile, JSON.stringify(certificateOrganization));
            fs.unlinkSync(certificateAdministratorFile);
            createCertificateIssuerMustSucceed();
          });
        }

        function createCertificateIssuerMustSucceed() {
          suite.execute('keyvault certificate issuer create %s --certificate-issuer-name %s --provider-name Test --account-id 1 --api-key 99 --certificate-organization-file %s --json', testVault, certificateIssuerName, certificateOrganizationFile, function(result) {
            result.exitStatus.should.be.equal(0);
            certificateIssuer = JSON.parse(result.text);
            fs.unlinkSync(certificateOrganizationFile);
            createTestIssuerBasedCertificateMustSucceed();
          });
        }

        function createTestIssuerBasedCertificateMustSucceed() {
          suite.execute('keyvault certificate policy create --issuer-name %s --subject-name CN=AZURE --secret-content-type application/x-pem-file --validity-in-months 24 --json', certificateIssuerName, function(result) {
            result.exitStatus.should.be.equal(0);
            certificatePolicy = JSON.parse(result.text);
            certificatePolicyFile = 'policy.js';
            fs.writeFileSync(certificatePolicyFile, JSON.stringify(certificatePolicy));
            createCertificateMustSucceed();
          });
        }

        function createCertificateMustSucceed() {
          suite.execute('keyvault certificate create %s %s --certificate-policy-file %s --json', testVault, certificateName, certificatePolicyFile, function(result) {            
            result.exitStatus.should.be.equal(0);
            certificateOperation = JSON.parse(result.text);
            fs.unlinkSync(certificatePolicyFile);

            // Wait 120 seconds for enrollment to complete.
            var start = new Date().getTime();
            while (new Date().getTime() < start + 120000);
            enrollCertificateMustSucceed();
          });
        }

        function enrollCertificateMustSucceed() {
          suite.execute('keyvault certificate operation show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            certificateOperation = JSON.parse(result.text);
            certificateOperation.status.should.be.equal("completed");
            showCertificateMustSucceed();
          });
        }

        function showCertificateMustSucceed() {
          suite.execute('keyvault certificate show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificate = JSON.parse(result.text);
            certificate.should.have.property('id');
            certificateId = certificate.id;
            var subscription = profile.current.getSubscription();
            certificateId.should.include(util.format('https://%s%s/certificates/%s/', testVault.toLowerCase(), subscription.keyVaultDnsSuffix, certificateName));
            certificate.should.have.property('cer');
            listCertificatesMustSucceed();
          });
        }

        function listCertificatesMustSucceed() {
          suite.execute('keyvault certificate list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificateId.indexOf(certificate.id + '/') === 0;
            }).should.be.true;
            listCertificateVersionsMustSucceed();
          });
        }

        function listCertificateVersionsMustSucceed() {
          suite.execute('keyvault certificate list-versions %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificate.id === certificateId;
            }).should.be.true;
            deleteCertificateMustSucceed();
          });
        }

        function deleteCertificateMustSucceed() {
          suite.execute('keyvault certificate delete %s %s --quiet', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustFail();
          });
        }

        function showCertificateMustFail() {
          suite.execute('keyvault certificate show %s %s', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Certificate %s not found', certificateName));
            done();
          });
        }

      });

      it('certificate policy management commands should work', function(done) {

        var certificateName = suite.generateId(certificatePrefix, knownNames);
        var importCertificateContent = 'MIIKKAIBAzCCCeQGCSqGSIb3DQEHAaCCCdUEggnRMIIJzTCCBhYGCSqGSIb3DQEHAaCCBgcEggYDMIIF/zCCBfsGCyqGSIb3DQEMCgECoIIE/jCCBPowHAYKKoZIhvcNAQwBAzAOBAiKTp+7CoR5MwICB9AEggTY/IKeiENcZyCYPTY5sUKSMAmtZg7hT2YNqirIDX0EYjIf9lIzfF+uf2n5qfear6aVVD9L8LaTKdTSUkmoV9pbCW+rr1YDbEF5v/bp289+V5hg8tf+OIEEshzTxot7VKk/laVKM6uMumBPCQvdiZa69rt2m515Z9smOYU79CXW7YKtrGgnOnk9fuFc8uGvvtm1fWQZHi7Dtm3vdDt2tvpdFebV0DqAPtAZOWhF8KIUBEFL0rq0j/U3VtB0D9RElbhzi9zFHbBvQkSvri9oa+agUYexd87DlEeksgQXZaFMCkaxcAPvlzCSDB6KspfaprksoayxhmbfchRK9WOVkx4iQE84M7PP3c5wJ9z+BebtTpqc6rolUJAkKKqKe78yD+y0Bz9nme1i1YP4puqMNxdDZV+Vs0KzFfKeIr9BuIYlPMkggQ0dJJBTIpakc2NW+pU2vlzU2fSNzscVP9utIwYVlijGRROXF5yRNT5Ntharw/xiUg35LByuKpgdf0QIH7hrk4HUQpyBSiV1gE4aEjTq9EBbUf+oSxPa6ftdGOOUR1USIqoMBKw3g2PG5lSi1EL6yyFzy42E+E2Xi+T36senP3pEYzJjM8MfLKcaSTYwDEvVH7phQTY7OT7i5Ox8YG7MgKSMaQ4SQ8UVyfrc6EWYmY0rY/LdYoXxz6yrQyF9OlIEIGgZoOkW40jX2Jz9HW0dMFOPkRuqnL2zoEJnVQQLhgjdvYdTXmwv2+V8bxe7ePG3EKEUSuktZnsA5schBrTq4GkI62UJwZeeDFMDHjKIl+IE1gPpp4mR+APSslKBB2Z4Tenbu1AToMe4rDeyLJtDbuHuJ9VfyT/SwpeObihbr/VyRQMKVRvX2oIz/P0WU5l2Pm3pcen6E+jCij0K+SF4CDNT8uP2/ON6983RPjnGymPUQ73aIoWXTQsK9Bl5u+Jqdsn79nILAdMVwE94nv/N8waeS7g380129jnBvPT7BsWYybv9j1wDsiaW+Oy26GsLlbGzjtsa9KDTXPdYlDjnwEZdDxpKzijPrnvfq4qT0PsgMEZhcV0efT7BbuLzVokFUCr3eXKMP/OqBKlOIE/GE61+JlVRBtzB+dW5DYnWlJNjtfWBp+9PcZc/nhSqFrGrTehV6/0lpznQ/XNy6B7v6kNW5ngQe1pAl4E5z7oITsHG5crQcu/RM14mUWcs1xUgLjrIR+zdCcfkWMrXJeRoJvCilQLBiJ+cItri/tOL+gQnt6QVudkROrUmQLtKcI8WS3hxb+cWrTk5obaQAkOCTqh9ZNo2z3YO6Ek4FZTEs3gWiAVEgrxVzThJXNqbckfrvB7RY3MHCa8anbwJdWNAcdFImxH835TD42NtpcLxAJ/ucH8O2bmcBLUBvOhdK+aLMokiDvcaA1mVdJCuAewbRurt52TQRulYC1G67Q10Tt5NwRqrIn8GkfCtz1CUgMjhMmXCyFt2kefwWVlbOX0EjOZKUIosDuSlH4gV71vWDeq+JbkYSxJyG2E0Yhl6pGhgddmeeSU9UTuHji7fuCLFVtrlMgpd2sTLqzOWjcIFejbwHNNZkZjL5yWKUrpaqe5sd9WRy1U6PH/iK84ek6Pmo69Y/YvnTi8/DiYpmrap0cgcftHuNcd+h2OhgglTXuYnZsS07H4PyjGB6TATBgkqhkiG9w0BCRUxBgQEAQAAADBXBgkqhkiG9w0BCRQxSh5IAGEANgAyAGIANgA5AGMAMwAtADkAZgBjADAALQA0AGEAZQBmAC0AYQBjAGEAMwAtAGMAZABjAGMAMgAxADQAZAA1ADgANQAxMHkGCSsGAQQBgjcRATFsHmoATQBpAGMAcgBvAHMAbwBmAHQAIABFAG4AaABhAG4AYwBlAGQAIABSAFMAQQAgAGEAbgBkACAAQQBFAFMAIABDAHIAeQBwAHQAbwBnAHIAYQBwAGgAaQBjACAAUAByAG8AdgBpAGQAZQByMIIDrwYJKoZIhvcNAQcGoIIDoDCCA5wCAQAwggOVBgkqhkiG9w0BBwEwHAYKKoZIhvcNAQwBBjAOBAjUGyZnibwFRAICB9CAggNoiczPdE4wuOyv6Ei5c5xij93/FKWdelietGpngONdsRKjC1+uzNokx/vgfe+O2OKj5fC5ZmmiYK84iot7bpHodjYWLXg35TcNWRzrDuilYw7LPFsS7WqhCrazldLjnJJEPEh2lYo96kllquYIzBaRXkuwCo9r0m29ofqV0SROJCs7va3wp5FUR8K8W9o18d3kZSK0DhEO6BsnKJet6GL/vU/N3Z/oLv5HGZNOAwSJni08CQfiq2qqgPLDfE5iZuVmUSFsNwIvxcTlIRG3FyYguX8jNzOG4NxW7OmgvUWuwFaoHrOdrIQN9zuWxSgdZOJgP6kH6DDg4KTzbeYb4Hy7Hi4G2UwusVYVdIOdg2y6gWXQBuD81t+CDzrmEp+EhAvYZSHfUOZla0I/MYU21aedZgTeoTklU3gD43CjxGWWdPUPdZJwXgSplxIIjnemjAJ+VluEX3V8JjNGDp+y68j0ts91y+72e5/KNc3pr6eXvZNTySOopMr/Pi1PkYfPymrCEqfelk572CcnmuyA99Vw4gr0jAMR0X0YYSZ5GnhaSCI1dCO+eCCjROosEJwNNcSPT17ycvEUFrX9mt8kXzRvOfW1xS+bn0GpicNWYMXkBw/rz8JR3LxgncsaPdcp724+vNgJuF4JiximjTd9TH4n9O6X9pCA68VdiPutNegOThqFGTs1b0WItayqfkTOzRg+JOZrk311ia2go+O7+T+EqB3JlVcq6F+yQ3Lkqp2Tr8d0UMMF7fR0bj8EwzEl0CuWGN5xyfJc3tQJznLJo9e2nYZtQ3tw5Dy3gwKfmO/FKQ2umxiX3ZvHk8/DIUYn++YH5EaGLlwppHPcKVy0X7Kii7LE1nekYkCRMC+sXpO0V8Eq91x2YxmSHyo1RJGra+kybZZ7cO3QBJwhS5PyosGZnR39z2ShHMk8PrbkQSFv3kJqxeIV4E2KnWnbxyjrXLS3XBhCyS4uCxiFZzXGcFXjlSAUnQ9DpHrxvoKbVipekVjOTjuoFk5SzkQgiOa+WREvHv3YU0iJGjnV78XB+ZKqG9q1ok/tEDssf0TaOL6cT0OV4BqRQyu6cuYk/630MpVbkJJG8OBg/5oL9muO2oFaxfVZGeQpWNTah9yaCj7piaXok43nnEne3CNvxCBCEBPz4GcDvlTOjy4wOzAfMAcGBSsOAwIaBBQFPX6XGMp7gA4008VqyInDcud/TQQUBqn/Em9qWdkmXyOdpr2zLZDjOFECAgfQ';
        var importCertificatePassword = '123';
        var importCertificatePolicy = '{ \"keyProperties\" : { \"exportable\" : true, \"keyType\" : \"RSA\", \"keySize\" : 2048, \"reuseKey\" : false }, \"secretProperties\" : { \"contentType\" : \"application/x-pkcs12\" }, \"issuerReference\" : { \"name\" : \"Self\" } }';

        var certificatePolicy, certificatePolicyFile;
        var certificateId;

        importCertificateMustSucceed();

        function importCertificateMustSucceed() {
          suite.execute('keyvault certificate import %s %s --content %s --password %s --certificate-policy %s', testVault, certificateName, importCertificateContent, importCertificatePassword, importCertificatePolicy, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustSucceed();
          });
        }

        function showCertificateMustSucceed() {
          suite.execute('keyvault certificate show %s %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificate = JSON.parse(result.text);
            certificate.should.have.property('id');
            certificateId = certificate.id;
            var subscription = profile.current.getSubscription();
            certificateId.should.include(util.format('https://%s%s/certificates/%s/', testVault.toLowerCase(), subscription.keyVaultDnsSuffix, certificateName));
            certificate.should.have.property('cer');            
            listCertificatesMustSucceed();
          });
        }

        function listCertificatesMustSucceed() {
          suite.execute('keyvault certificate list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificateId.indexOf(certificate.id + '/') === 0;
            }).should.be.true;
            listCertificateVersionsMustSucceed();
          });
        }

        function listCertificateVersionsMustSucceed() {
          suite.execute('keyvault certificate list-versions %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificates = JSON.parse(result.text);
            certificates.some(function(certificate) {
              return certificate.id === certificateId;
            }).should.be.true;
            getCertificatePolicyMustSucceed();
          });
        }

        function getCertificatePolicyMustSucceed() {
          suite.execute('keyvault certificate policy show %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            certificatePolicy = JSON.parse(result.text);
            certificatePolicy.x509CertificateProperties.validityInMonths.should.be.equal(298);

            // Update validity to 300
            certificatePolicy.x509CertificateProperties.validityInMonths = 300;
            certificatePolicyFile = 'policy.js';
            fs.writeFileSync(certificatePolicyFile, JSON.stringify(certificatePolicy));
            updateCertificatePolicyMustSucceed();
          });
        }

        function updateCertificatePolicyMustSucceed() {
          suite.execute('keyvault certificate policy set %s -c %s --certificate-policy-file %s --json', testVault, certificateName, certificatePolicyFile, function(result) {
            result.exitStatus.should.be.equal(0);
            certificatePolicy = JSON.parse(result.text);
            certificatePolicy.x509CertificateProperties.validityInMonths.should.be.equal(300);
            fs.unlinkSync(certificatePolicyFile);
            getUpdatedCertificatePolicyMustSucceed();
          });
        }

        function getUpdatedCertificatePolicyMustSucceed() {
          suite.execute('keyvault certificate policy show %s -c %s --json', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            certificatePolicy = JSON.parse(result.text);
            certificatePolicy.x509CertificateProperties.validityInMonths.should.be.equal(300);
            deleteCertificateMustSucceed();
          });
        }

        function deleteCertificateMustSucceed() {
          suite.execute('keyvault certificate delete %s %s --quiet', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustFail();
          });
        }

        function showCertificateMustFail() {
          suite.execute('keyvault certificate show %s %s', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Certificate %s not found', certificateName));
            done();
          });
        }

      });

      it('certificate contact and management commands should work', function(done) {

        addCertificateContactMustSucceed();

        function addCertificateContactMustSucceed() {
          suite.execute('keyvault certificate contact add %s --email-address john.doe@contoso.com --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificateContacts = JSON.parse(result.text);
            certificateContacts.some(function(contact) {
              return contact.emailAddress == "john.doe@contoso.com";
            }).should.be.true;
            listCertificateContactMustSucceed();
          });
        }

        function listCertificateContactMustSucceed() {
          suite.execute('keyvault certificate contact list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var certificateContacts = JSON.parse(result.text);
            certificateContacts.some(function(contact) {
              return contact.emailAddress == "john.doe@contoso.com";
            }).should.be.true;
            deleteCertificateContactMustSucceed();
          });
        }

        function deleteCertificateContactMustSucceed() {
          suite.execute('keyvault certificate contact delete %s --email-address john.doe@contoso.com --quiet', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            listCertificateContactsMustFail();
          });
        }

        function listCertificateContactsMustFail() {
          suite.execute('keyvault certificate contact list %s', testVault, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include('Contacts not found');
            done();
          });
        }

      });

      it('incorrect certificate merge should fail', function(done) {
        var certificateName = suite.generateId(certificatePrefix, knownNames);
        var certificateContent = '[ \"MIICODCCAeagAwIBAgIQqHmpBAv+CY9IJFoUhlbziTAJBgUrDgMCHQUAMBYxFDASBgNVBAMTC1Jvb3QgQWdlbmN5MB4XDTE1MDQyOTIxNTM0MVoXDTM5MTIzMTIzNTk1OVowFzEVMBMGA1UEAxMMS2V5VmF1bHRUZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5bVAT73zr4+N4WVv2+SvTunAw08ksS4BrJW/nNliz3S9XuzMBMXvmYzU5HJ8TtEgluBiZZYd5qsMJD+OXHSNbsLdmMhni0jYX09h3XlC2VJw2sGKeYF+xEaavXm337aZZaZyjrFBrrUl51UePaN+kVFXNlBb3N3TYpqa7KokXenJQuR+i9Gv9a77c0UsSsDSryxppYhKK7HvTZCpKrhVtulF5iPMswWe9np3uggfMamyIsK/0L7X9w9B2qN7993RR0A00nOk4H6CnkuwO77dSsD0KJsk6FyAoZBzRXDZh9+d9R76zCL506NcQy/jl0lCiQYwsUX73PG5pxOh02OwKwIDAQABo0swSTBHBgNVHQEEQDA+gBAS5AktBh0dTwCNYSHcFmRjoRgwFjEUMBIGA1UEAxMLUm9vdCBBZ2VuY3mCEAY3bACqAGSKEc+41KpcNfQwCQYFKw4DAh0FAANBAGqIjo2geVagzuzaZOe1ClGKhZeiCKfWAxklaGN+qlGUbVS4IN4V1lot3VKnzabasmkEHeNxPwLn1qvSD0cX9CE=\" ]'

        var certificatePolicy, certificatePolicyFile;

        incorrectCertificateMergeShouldFail();

        function incorrectCertificateMergeShouldFail() {
          suite.execute('keyvault certificate policy create --issuer-name Unknown --subject-name CN=Test --json', function(result) {
            result.exitStatus.should.be.equal(0);
            certificatePolicy = JSON.parse(result.text);
            certificatePolicyFile = 'policy.js';
            fs.writeFileSync(certificatePolicyFile, JSON.stringify(certificatePolicy));
            createCertificateForMergeMustSucceed();
          });
        }

        function createCertificateForMergeMustSucceed() {
          suite.execute('keyvault certificate create %s -c %s --certificate-policy-file %s --json', testVault, certificateName, certificatePolicyFile, function(result) {
            result.exitStatus.should.be.equal(0);
            fs.unlinkSync(certificatePolicyFile);
            mergeCertificateMustFail();
          });
        }

        function mergeCertificateMustFail() {
          suite.execute('keyvault certificate merge %s -c %s --content %s', testVault, certificateName, certificateContent, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include("Public key from x509 certificate and key of this instance doesn't match");
            deleteCertificateMustSucceed();
          });
        }

        function deleteCertificateMustSucceed() {
          suite.execute('keyvault certificate delete %s %s --quiet', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(0);
            showCertificateMustFail();
          });
        }

        function showCertificateMustFail() {
          suite.execute('keyvault certificate show %s %s', testVault, certificateName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Certificate %s not found', certificateName));
            done();
          });
        }

      });

    });

  });
});