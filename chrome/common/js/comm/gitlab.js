define(['lib/jquery', 'lib/knockout', 'comm/communicator', 'comm/fieldInfo'], function ($, ko, Communicator, FieldInfo) {
    var GitlabCommunicator = (function (_super) {
        GitlabCommunicator.prototype = Object.create(_super.prototype);
        function GitlabCommunicator(settings) {
          console.log('gitlab');
            _super.call(this, settings);
        }
        GitlabCommunicator.prototype.search = function (query) {
            // Gitlab's API does not allow searching issues by title. Loading
            // all issues manually and searching them would be too heavy. Also,
            // Gitlab's API will only load a maximum of 100 issues (this is what
            // we do for now).
            return this.ajax(this.Url() + "api/v3/issues", {per_page: 100}, 'GET').then(function (data) {
                return $.map(data, function (item) {
                    item.Name = '#' + item.iid + " " + item.title;
                    item.Id = item.id;
                    return item;
                });
            });
        };
        GitlabCommunicator.prototype.searchLabel = function (query, fields) {
          return this.ajax(this.Url() + "api/v3/projects/" + fields.project.Value() + "/labels", {per_page: 100}, 'GET').then(function (data) {
                return $.grep($.map(data, function (item) {
                    item.Name = item.name;
                    item.Id = item.name;
                    return item.name.toLowerCase().indexOf(query.toLowerCase()) === -1 ? false : item;
                }), function (item) {
                  return item !== false;
                });
            });
        };
        GitlabCommunicator.prototype.comment = function (issueId, comment, fields) {
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
            // load page, get csrf token, submit form, update issue.
            function b64toBlob(b64Data, contentType, sliceSize) {
              contentType = contentType || '';
              sliceSize = sliceSize || 512;

              var byteCharacters = atob(b64Data);
              var byteArrays = [];

              for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                  var slice = byteCharacters.slice(offset, offset + sliceSize);

                  var byteNumbers = new Array(slice.length);
                  for (var i = 0; i < slice.length; i++) {
                      byteNumbers[i] = slice.charCodeAt(i);
                  }

                  var byteArray = new Uint8Array(byteNumbers);

                  byteArrays.push(byteArray);
              }

              var blob = new Blob(byteArrays, {type: contentType});
              return blob;
          }
            var self = this;
            var deferred = $.Deferred();
            this.ajax(self.getRedirectUrl(issueId, fields), null, 'GET').then(function(data) {
                return $(data).find(':input[name="authenticity_token"]:first').val();
            }).then (function (token) {
              var formData = new FormData();
              formData.append("markdown_img", b64toBlob(fileContent, 'image/png'), 'screenshot.png');
              $.ajax({
                url: fields.project.Option().WebUrl + '/upload_image',
                type: 'POST',
                data: formData,
                dataType: 'json',
                processData: false,
                contentType: false,
                headers: {
                  'accept': 'application/json',
                  'X-CSRF-TOKEN': token
                },
                success: function(response) {
                  var image = "![" + response.link.alt + "](" + response.link.url + ")";
                  // Load & update the issue.
                  self.loadIssue(issueId, fields).then(function (issue) {
                    var update = {
                      id: fields.project.Value(),
                      issue_id: issueId,
                      description: issue.description + "\n\n" + image
                    };
                    self.ajax(self.Url() + "api/v3/projects/" + fields.project.Value() + "/issues/" + issueId, update, 'PUT').done(function () {
                      deferred.resolve();
                    });
                  });
                },
                error: function (jqXHR, statusText) {
                  if (jqXHR.status === 401) {
                    alert('Please log in to Gitlab and try again.');
                  }
                }
              });
            });
            return deferred.promise();
        };
        GitlabCommunicator.prototype.create = function (title, description, fields, labels) {
            var data = {
                title: title,
                description: description,
                id: fields.project.Value(),
                labels: labels.join(',')
            };
            return this.ajax(this.Url() + 'api/v3/projects/' + fields.project.Value() + '/issues', data).then(function (data) {
              data.Id = data.id;
              return data;
            });
        };
        GitlabCommunicator.prototype.getProjectPageNums = function () {
          var self = this;
          return self.ajax(self.Url() + "api/v3/projects?per_page=1&page=" + 1, null, 'GET').then(function (data, link) {
            if (link.indexOf('rel="last"') !== -1) {
              var parts = link.split(',');
              for (var i = 0; i < parts.length; i++) {
                if (parts[i].indexOf('rel="last"') !== -1) {
                  return Math.ceil(parseInt(parts[i].match(/(\?|\&)page=(\d+)(\&|$)/)[2], 10) / 100);
                }
              }
            }
            return 1;
          });
        };
        GitlabCommunicator.prototype.loadProjects = function () {
            var self = this;
            var deferred = $.Deferred();
            self.getProjectPageNums().done(function (pageNums) {
              var pageRequests = [];
              for (var i = 1; i <= pageNums; i++) {
                var pageRequest = self.ajax(self.Url() + "api/v3/projects?per_page=100&page=" + i, null, 'GET').then(function (data, link) {
                    return $.map(data, function (item) {
                        return {Id: item.id, Name: item.name_with_namespace, WebUrl: item.web_url};
                    });
                });
                pageRequests.push(pageRequest);
              }
              return $.when.apply($, pageRequests).done(function() {
                var projects = [];
                for (var i = 0; i < arguments.length; i++) {
                  projects = projects.concat(arguments[i]);
                }
                deferred.resolve(projects);
              });
            });
            return deferred.promise();
        };
        GitlabCommunicator.prototype.loadIssue = function (issueId, fields, async) {
          if (typeof async === 'undefined') {
            async = true;
          }
          if (async) {
            var deferred = $.Deferred();
          }
          var response = {};
          var xhr = new XMLHttpRequest();
          xhr.open('GET', this.Url() + "api/v3/projects/" + fields.project.Value() + '/issues/' + issueId, async);
          xhr.setRequestHeader('Accept', "*/*", false);
          xhr.setRequestHeader('PRIVATE-TOKEN', this.Key());
          xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

          xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
              if (xhr.status == 200 || xhr.status == 201) {
                if(xhr.responseText === "null") {
                    throw new Error('Unable to login using supplied credentials.');
                } else {
                    response = JSON.parse(xhr.responseText);
                    if (async) {
                      deferred.resolve(response);
                    }
                }
              } else {
                if(!xhr.statusText || xhr.statusText == 'timeout' || xhr.statusText == "Not Found") {
                    throw new Error('Unable to connect to Gitlab at specified URL.');
                } else {
                    throw new Error('Unable to login using supplied credentials.');
                }
              }
            }
          };
          xhr.send();
          return async ? deferred.promise() : response;
        };

        GitlabCommunicator.prototype.getRedirectUrl = function (issueId, fields) {
            _super.prototype.getRedirectUrl.call(this, issueId, fields);
            var issue = this.loadIssue(issueId, fields, false);
            return fields.project.Option().WebUrl + '/issues/' + issue.iid;
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
        GitlabCommunicator.prototype.ajax = function(url, data, method, headers) {
            var deferred = $.Deferred();
            if (typeof headers === 'undefined') {
              headers = {};
            }
            var xhr = new XMLHttpRequest();
            xhr.open((method || 'POST'), url, true);
            xhr.setRequestHeader('Accept', "*/*", false);
            xhr.setRequestHeader('PRIVATE-TOKEN', this.Key());
            if (typeof headers['Content-Type'] === 'undefined') {
              xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            }
            for (var i in headers) {
              if (headers.hasOwnProperty(i)) {
                xhr.setRequestHeader(i, headers[i]);
              }
            }
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200 || xhr.status == 201) {
                        if(xhr.responseText === "null") {
                            deferred.reject('Unable to login using supplied credentials.');
                        } else {
                            if (xhr.getResponseHeader('Content-Type').indexOf('json') !== -1) {
                              deferred.resolve(JSON.parse(xhr.responseText), xhr.getResponseHeader('link'));
                            }
                            else {
                              deferred.resolve(xhr.responseText, xhr.getResponseHeader('link'));
                            }
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
