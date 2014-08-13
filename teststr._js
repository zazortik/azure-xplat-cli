var pr = "/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourceGroups/xDeploymentTestGroup7/providers/Microsoft.Sql/servers/sqlserver901";

var rg = "/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourcegroups/xDeploymentTestGroup7";

var sub = "/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1";
var sub1 = "/subscriptions/2d006e8c-61e7-4cd2-8804-b489a4341a1";
var cr = "/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourceGroups/xDeploymentTestGroup7/providers/Microsoft.Sql/servers/sqlserver901/databases/sqldb901";

var ps = rg;

var rs = sub;


function isScopeAtAndAbove(scope, rcvdScope) {
	console.log("prvdscope - " + scope);
	console.log("rcvdScope - " + rcvdScope);
	if (scope.indexOf(rcvdScope) > -1) {
	return (scope.indexOf(rcvdScope));
	}
	else {
	return (scope.indexOf(rcvdScope));
	}
}

var result = isScopeAtAndAbove(ps,rs);
console.log("isScopeAtAndAbove " + result);