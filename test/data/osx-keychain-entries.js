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

exports.entry1 =
  'keychain: "/Users/chris/Library/Keychains/login.keychain"\n' +
  'class: "genp"' + '\n' +
  'attributes:' + '\n' +
  '    0x00000007 <blob>="azure"' + '\n' +
  '    0x00000008 <blob>=<NULL>' + '\n' +
  '    "acct"<blob>="a:b:c:d"' + '\n' +
  '    "cdat"<timedate>=0x32303134303630323137323535385A00  "20140602172558Z\\000"' + '\n' +
  '    "crtr"<uint32>=<NULL>' + '\n' +
  '    "cusi"<sint32>=<NULL>' + '\n' +
  '    "desc"<blob>="active directory token"' + '\n' +
  '    "gena"<blob>=<NULL>' + '\n' +
  '    "icmt"<blob>=<NULL>' + '\n' +
  '    "invi"<sint32>=<NULL>' + '\n' +
  '    "mdat"<timedate>=0x32303134303630323137323535385A00  "20140602172558Z\\000"' + '\n' +
  '    "nega"<sint32>=<NULL>' + '\n' +
  '    "prot"<blob>=<NULL>' + '\n' +
  '    "scrp"<sint32>=<NULL>' + '\n' +
  '    "svce"<blob>="azure"' + '\n' +
  '    "port"<uint32>=0x00000000' + '\n' +
  '    "type"<uint32>=<NULL>' + '\n';

exports.entry2 =
  'keychain: "/Users/chris/Library/Keychains/login.keychain"' + '\n' +
  'class: 0x00000008' + '\n' +
  'attributes:' + '\n' +
  '    0x00000007 <blob>="azure"' + '\n' +
  '    0x00000008 <blob>=<NULL>' + '\n' +
  '    "acct"<blob>="e:f:g:h"' + '\n' +
  '    "cdat"<timedate>=0x32303134303630323137323735385A00  "20140602172758Z\\000"' + '\n' +
  '    "crtr"<uint32>=<NULL>' + '\n' +
  '    "cusi"<sint32>=<NULL>' + '\n' +
  '    "desc"<blob>="active directory token"' + '\n' +
  '    "gena"<blob>=<NULL>' + '\n' +
  '    "icmt"<blob>=<NULL>' + '\n' +
  '    "invi"<sint32>=<NULL>' + '\n' +
  '    "mdat"<timedate>=0x32303134303630323137323735385A00  "20140602172758Z\\000"' + '\n' +
  '    "nega"<sint32>=<NULL>' + '\n' +
  '    "prot"<blob>=<NULL>' + '\n' +
  '    "scrp"<sint32>=<NULL>' + '\n' +
  '    "svce"<blob>="azure"' + '\n' +
  '    "type"<uint32>=<NULL>' + '\n';

exports.badEntry = 
  'keychain: "/Users/kundanap/Library/Keychains/login.keychain"' + '\n' +
  'class: 0x00000008' + '\n' +
  'attributes:' + '\n' +
  '    "acct"<blob>="bad guy"' + '\n' +
  '    "snbr"<blob>=""63X"' + '\n' + 
  '    "cenc"<uint32>=0x00000003' + '\n';

exports.superbadEntry = 
  'keychain: "/Users/kundanap/Library/Keychains/login.keychain"' + '\n' +
  'attributes:' + '\n' +
  '    "acct"<blob>="super bad guy"' + '\n'  + '\n'
  '    0x12321432 <uint32>="$@#%^^$^^&^&%^63X"';
