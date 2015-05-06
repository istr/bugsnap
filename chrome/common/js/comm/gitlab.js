define(['lib/jquery', 'lib/knockout', 'comm/communicator', 'comm/fieldInfo'], function ($, ko, Communicator, FieldInfo) {
    var GitlabCommunicator = (function (_super) {
        var isFF = window.navigator.userAgent.indexOf('Firefox') != -1;
        GitlabCommunicator.prototype = Object.create(_super.prototype);
        function GitlabCommunicator(settings) {
            _super.call(this, settings);
        }
        GitlabCommunicator.prototype.search = function (query) {
            // Gitlab's API does not allow searching issues by title. Loading
            // all issues manually and searching them would be to heavy. Also,
            // Gitlab's API will only load a maximum of 100 issues (this is what
            // we do for now.
            return this.ajax(this.Url() + "api/v3/issues", {per_page: 100}).then(function (data) {
                return $.map(data, function (item) {
                    item.Name = '#' + item.iid + " " + item.title;
                    item.Id = item.id;
                    return item;
                });
            });
        };
        GitlabCommunicator.prototype.comment = function (issueId, comment, fields) {
            var ids = issueId.split('|');
            var data = {
                id: fields.project.Value(),
                issue_id: issueId,
                body: comment
            };
            return this.ajax(this.Url() + "api/v3/projects/" + data.id + '/issues/' + issueId + '/notes', data).then(function (data) {
                fields.project.Value(fields.project.Value());
                return data;
            });
        };
        GitlabCommunicator.prototype.attach = function (issueId, fileContent, fields) {
            // http://feedback.gitlab.com/forums/176466-general/suggestions/3865548-api-to-attach-attachments-to-notes-issue-comments
            // This is not implemented yet. Bugsnap needs this!?
        };
        GitlabCommunicator.prototype.create = function (title, description, fields) {
            var data = {
                title: title,
                description: description,
                id: fields.project.Value()
            };
            return this.ajax(this.Url() + 'api/v3/projects/' + fields.project.Value() + '/issues/', data);
        };
        GitlabCommunicator.prototype.loadProjects = function () {
            return this.ajax(this.Url() + "api/v3/projects/", null, 'GET').then(function (data) {
                return $.map(data, function (item) {
                    return {Id: item.id, Name: item.name_with_namespace};
                });
            });
        };

        GitlabCommunicator.prototype.getRedirectUrl = function (issueId, fields) {
            _super.prototype.getRedirectUrl.call(this, issueId, fields);
            return this.Url() + 'api/v3/projects/' + fields.project.Value() + '/issues/' + issueId;
        };
        GitlabCommunicator.prototype.test = function () {
            return this.loadProjects();
        };
        GitlabCommunicator.prototype.getFields = function () {
            var fields = {
                project: new FieldInfo({Caption: 'Project'})
            };
            this.loadProjects().done(function (data) {
                fields.project.Options(data);
            });
            return fields;
        };
        GitlabCommunicator.prototype.ajax = function(url, data, method) {
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true);
            xhr.setRequestHeader('Accept', "*/*", false);
            xhr.setRequestHeader('PRIVATE-TOKEN', this.Key());
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        if(xhr.responseText === "null") {
                            deferred.reject('Unable to login using supplied credentials.');
                        } else {
                            deferred.resolve(JSON.parse(xhr.responseText));
                        }
                    } else {
                        if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                            deferred.reject('Unable to connect to Gitlab at specified URL.');
                        } else {
                            deferred.reject('Unable to login using supplied credentials.');
                        }
                    }
                }
            };
            xhr.send(JSON.stringify(data));
            return deferred.promise();
        };
        return GitlabCommunicator;
    })(Communicator);
    return GitlabCommunicator;
});
