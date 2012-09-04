define('app/models/machine', ['ember'],
	/**
	 * Machine model
	 *
     * Also check state mapping in config.py
	 * @returns Class
	 */
	function() {
		return Ember.Object.extend({
			id: null,

			imageId: null,

			image: null,
			name: null,
			backend: null,
			selected: false,
			hasKey: false,
            hasMonitoring: false,
			state: 'stopped',

			reboot: function(){
				console.log('reboot');

				var that = this;

				$.ajax({
                    url: '/backends/' + this.backend.index + '/machines/' + this.id,
                    type: 'POST',
                    data: "action=reboot",
                    success: function(data) {
                    	console.log("machine rebooting");
                        that.set('state', 'rebooting');
                    }

				}).error(function(e) {
					Mist.notificationController.notify("Error rebooting machine: " + that.name);
					console.error("Error rebooting machine: " + that.name);
					console.error(e.state + " " + e.stateText);
				});
			},

			destroy: function(){
				console.log('destroy');
				$.ajax({
                    url: '/backends/' + this.backend.index + '/machines/' + this.id,
                    type: 'POST',
                    data: "action=destroy",
                    success: function(data) {
                    	console.log("machine being destroyed");
                        that.set('state', 'pending');
                    }
				}).error(function(e) {
					Mist.notificationController.notify("Error destroying machine: " + that.name);
					console.error("Error destroying machine: " + that.name);
					console.error(e.state + " " + e.stateText);
				});
			},

			start: function(){
				console.log('start');

				var that = this;

				$.ajax({
                    url: 'backends/' + this.backend.index + '/machines/' + this.id,
                    data: 'action=start',
                    type: 'POST',
                    success: function(data) {
                        console.log('machine starting');
                        that.set('state', 'pending');
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                    	Mist.notificationController.notify("Error starting machine: " +
                    			that.name);
    					console.log("Error starting machine: " + that.name);
    					console.log(textstate + " " + errorThrown);
                    }
                });
			},

			shutdown: function(){
				console.log('shutting down');

				var that = this;

				$.ajax({
                    url: 'backends/' + this.backend.index + '/machines/' + this.id,
                    data: 'action=stop',
                    type: 'POST',
                    success: function(data) {
                        console.log('machine being shut down');
                        that.set('state', 'stopped');
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                    	Mist.notificationController.notify("Error shutting down machine: " +
                    			that.name);
    					console.log("Error shutting down machine: " + that.name);
    					console.log(textstate + " " + errorThrown);
                    }
                });
			},

			shell: function(shell_command, callback){

				var that = this;

                console.log('Sending ' + shell_command + ' to machine: ' + that.name);

                var host;
                if (this.extra.dns_name) {
                    // it is ec2 machine
                    host = this.extra.dns_name;
                } else {
                    // if not ec2 it should have a public ip
                    host = this.public_ips[0];
                }

				$.ajax({
                    url: '/backends/' + this.backend.index + '/machines/' + this.id + '/shell',
                    data: {'host': host,
                           'provider': this.backend.provider,
                           'command': shell_command},
                    type: 'POST',
                    success: function(data) {
                        console.log("Shell command sent.Result: " + data);
                        if (data){
                            callback(data);
                        }
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                    	Mist.notificationController.notify("Error sending command " + shell_command + " to machine: " +
                    			that.name);
    					console.log("Error sending shell command to machine: " + that.name);
    					console.log(textstate + " " + errorThrown);
                    }
                });

			},

			hasAlert : function(){
				//TODO when we have alerts
				return false;
			}.property('hasAlert'),

			startUptimeTimer: function(){
				var that = this;

				setInterval(function(){
					if(that.get('state' != 0) || !that.get('uptimeFromServer') || !that.get('uptimeChecked')){
						return;
					} else {
						that.set('uptime', that.get('uptimeFromServer') + (Date.now() - that.get('uptimeChecked')));
					}

				},1000);
			},

			checkUptime: function(){
				if (this.hasKey) {
					var that = this;

                    var host;
                    if (this.extra.dns_name) {
                        // it is ec2 machine
                        host = this.extra.dns_name;
                    } else {
                        // if not ec2 it should have a public ip
                        host = this.public_ips[0];
                    }
					$.ajax({
						url: '/backends/' + this.backend.index + '/machines/' + this.id + '/uptime',
						data: {'host': host,
                               'provider': this.backend.provider},
						success: function(data) {
							console.log("machine uptime");
							console.log(data);
							if('uptime' in data){
								that.set('uptimeChecked', Date.now());
								that.set('uptimeFromServer', data.uptime);
							}
						}
					}).error(function(jqXHR, textStatus, errorThrown) {
						console.log('error querying for machine uptime for machine id: ' + that.id);
						console.log(textStatus + " " + errorThrown);
					});
				}
			},

			checkHasMonitoring: function(){
				var that = this;

				$.ajax({
					url: 'backends/' + this.backend.index + '/machines/' + this.id + '/monitoring',
					success: function(data) {
						console.log("machine has monitoring");
						console.log(data);
						if('monitoring' in data){
							that.set('hasMonitoring', data.monitoring);
						}
					}
				}).error(function(jqXHR, textStatus, errorThrown) {
					console.log('error querying for machine monitoring for machine id: ' + that.id);
					console.log(textStatus + " " + errorThrown);
				});
			},

			checkHasKey: function(){
				var that = this;

                var host;
                if (this.extra.dns_name) {
                    // it is ec2 machine
                    host = this.extra.dns_name;
                } else {
                    // if not ec2 it should have a public ip
                    host = this.public_ips[0];
                }

				$.ajax({
                    url: '/backends/' + this.backend.index + '/machines/' + this.id + '/key',
                    data: {'host': host,
                           'provider': this.backend.provider},
                    success: function(data) {
                    	console.log("machine has key? ");
                    	console.log(data);
                    	if(data){
                    		that.set('hasKey', data);
                    		that.checkUptime();
                    	} else {
                    		that.set('hasKey', false);
                    	}
                    }
				}).error(function(jqXHR, textStatus, errorThrown) {
					console.log('error querying for machine key for machine id: ' + that.id);
					console.log(textStatus + " " + errorThrown);
					that.set('hasKey', false);
				});

			},

			resetUptime: function(){
				if(this.state != 0){
					this.set('uptime', 0);
					this.uptimeTimer = false;
				} else {
					if(this.get('uptime') == 0){
						this.checkUptime();
					}
				}
			}.observes('state'),

			monitoringChanged: function(){
				var oldValue = !this.hasMonitoring;
				console.log("monitoring:  " + oldValue);

				var that = this;

				//Enable / Disable monitoring on server
				var payload = {
	                    "monitoring": this.hasMonitoring,
	            };

				$.ajax({
                    type: "POST",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify(payload),
                    // TODO: this should point to https://mist.io/....
                    url: 'backends/' + this.backend.index + '/machines/' + this.id + '/monitoring',
                    success: function(data) {

                    },
                    error: function(jqXHR, textstate, errorThrown) {
                    	that.set('hasMonitoring', oldValue);
                    }
                });

			}.observes('hasMonitoring'),

			init: function(){
				this._super();
				var that = this;
				this.backend.images.getImage(this.imageId, function(image){
					that.set('image', image);
				});
				this.startUptimeTimer();
				this.checkHasKey();
				this.checkHasMonitoring();
			}

		});
	}
);
