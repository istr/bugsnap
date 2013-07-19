define(['lib/jquery', 'comm/communicator', 'comm/fieldInfo'], function ($, Communicator, FieldInfo) {
    var JiraCommunicator = (function (_super) {
        JiraCommunicator.prototype = Object.create(_super.prototype);
        function JiraCommunicator(settings) {
            _super.call(this, settings);
            this.Url = function () {
                var url = this.Settings().Url;
                if (url.lastIndexOf('/') != url.length - 1) {
                    url += '/';
                }
                return url;
            };
            this.MetaData = {projects: []};
        }
        JiraCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        JiraCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.Url() + 'rest/api/2/project', {}, 'GET').then(function (data) {
                return $.map(data, function (item) {
                    return {Id: item.key, Name: item.name};
                });
            });
        };
        JiraCommunicator.prototype.search = function (query) {
            var jql = 'text ~ "' + query + '"';
            return this.ajax(this.Url() + 'rest/api/2/search?jql=' + encodeURIComponent(jql), {}, 'GET').then(function (data) {
                return $.map(data.issues, function (item) {
                    return {Id: item.key, Name: item.fields.summary};
                });
            });
        };
        JiraCommunicator.prototype.getFields = function () {
            var fields = {
                project: new FieldInfo({Caption: 'Project'}),
                issuetype: new FieldInfo({Caption: 'Issue Type'})
            };
            var self = this;
            this.ajax(this.Url() + 'rest/api/2/issue/createmeta', {}, 'GET').done(function (data) {
                self.MetaData = data;
                var projects = $.map(data.projects, function (item) {
                    return {Id: item.id, Name: item.name};
                });
                fields.project.Options(projects);
            });
            fields.project.Value.subscribe(function (projectId) {
                if (projectId) {
                    var projects = $.grep(this.MetaData.projects, function (item) {
                        return item.id == projectId;
                    });
                    if (projects.length > 0) {
                        var issuetypes = $.map(projects[0].issuetypes, function (item) {
                            return {Id: item.id, Name: item.name};
                        });
                        fields.issuetype.Options(issuetypes);
                    }
                }
            }, this);
            return fields;
        };
        JiraCommunicator.prototype.create = function (title, description, fields) {
            var data = { fields: {
                project: {id: fields.project.Value()},
                issuetype: {id: fields.issuetype.Value()},
                summary: title,
                description: description
            }};
            return this.ajax(this.Url() + 'rest/api/2/issue', data).then(function (data) {
                return {Id: data.key};
            });
        };
        JiraCommunicator.prototype.attach = function (issueId, fileContent) {
            var binary = atob(fileContent);
            var arr = [];
            for(var i = 0; i < binary.length; i++) {
                arr.push(binary.charCodeAt(i));
            }
            var fileBlob = new Blob([new Uint8Array(arr)], {type: 'image/png'});
            var data = new FormData();
            data.append('file', fileBlob, 'screenshot.png');
            return this.ajax(this.Url() + 'rest/api/2/issue/' + issueId + '/attachments', data);
        };
        JiraCommunicator.prototype.comment = function (issueId, comment) {
            var data = {
                body: comment
            };
            return this.ajax(this.Url() + 'rest/api/2/issue/' + issueId + '/comment', data);
        };
        JiraCommunicator.prototype.getRedirectUrl = function (issueId, fields) {
            _super.prototype.getRedirectUrl.call(this, issueId, fields);
            return this.Url() + 'browse/' + issueId;
        };
        JiraCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true);
            if (data instanceof FormData) {
                xhr.setRequestHeader('X-Atlassian-Token', 'nocheck');
            } else {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200 || xhr.status == 201) {
                        try {
                            deferred.resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            deferred.resolve(xhr.responseText);
                        }
                    } else {
                        if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                            deferred.reject('Unable to connect to YouTrack at specified URL.');
                        } else {
                            deferred.reject('Unable to login using supplied credentials.');
                        }
                    }
                }
            };
            if (data instanceof FormData) {
                xhr.send(data);
            } else {
                xhr.send(JSON.stringify(data));
            }
            return deferred.promise();
        };
        return JiraCommunicator;
    })(Communicator);
    return JiraCommunicator;
});
