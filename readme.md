# Elasticsearch Alerter
Yet another go at making an alternative to Elasticsearch's out-of-the-box alerting feature. This was inspired by Elastalert and Splunk alerts but is built as an attempt to keep things simple.

The goal is to keep things simple to begin with:
 - Copy and paste the Kibana DSL query out of the browser and paste it into a new rule.
 - Specify how often to run.
 - Specify what the trigger for an alert is.
 - Specify how to send out an alert.
 - Done

Simple here mostly means that there is not much going on. Not that everything is super easy for the user. I'm considering the use of DSL queries when I state this.

# Testing Rules
The app has multiple ways to facilitate testing. The following command line parameters or actions exist:
| Name | Description |
|---|---|
| test | Runs a single provided rule immediately and stops. This is effectively fully executing your rule without scheduling it. |
| --dryrun | Alerts won't actually fire off, output will be written to the console or outputted in other ways. |
| --outputFile | When `--dryrun` is provided, and the alert has a body (like in emails), then write the body to the output file instead of to the console. |

# Command Line Parameters
| Name | Description | Required |
|---|---|---|
| test | Refer to testing rules above. | |
| --version | Show version number. | |
| --rule, -r | Which rule or directory of rules to load. | Yes |
| --elasticsearchHost, -H | The elasticsearch host. | Yes |
| --elasticsearchPort, -p | The elasticsearch port. | |
| --dryrun, -d | Refer to testing rules above. | |
| --outputFile, -o | Refer to testing rules above. | |
| --config | Load parameters listed here from a yaml file instead. | |
| --logLevel, -l | The log level filter for output. Options are `Verbose`, `Info`, `Warning`, `Error`. Default is `Info`. | |
| --help, -h | Show help. | |

All parameters above can be provided as environmental variables with the prefix of `EA_`.
Examples:
 - `EA_RULE=/path/to/rules`
 - `EA_ELASTICSEARCH_HOST=elasticsearch.lan`
 - `EA_DRYRUN=true`

# Rule Definition
| Name | Description | Required |
|---|---|---|
| name | The name of the rule. | Yes |
| indexPattern | The index pattern to query. | Yes |
| request | The Elasticsearch [DSL query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html) to run in addition to any required aggregations. | Yes |
| interval | The cron pattern for when to execute the rule. | Yes |
| alertTrigger | The definition for the trigger for when to send alerts. | Yes |
| alert | The definition for the alert that gets sent. | Yes |
| waitBeforeReAlert | The definition for when to re-alert on following executions of the rule after an alert is sent. Defaults to always re-alert. | |
| followPaging | Whether or not to get all hits when paging is provided from Elasticsearch responses. If you are not using hit results in your alert triggers or templates, it is safe to set this to false to avoid making unnecessary consecutive calls to get all of the hits for a query. Defaults to `true`. | |

Example:
```yaml
name: SSHD Activity Alert
indexPattern: journalbeat-*
interval: "*/1 * * * *" # Run every minute

query: # The definition for the query. More on that later.
  bool:
  filter:
    - bool:
      # ...
    - range:
      "@timestamp":
      format: strict_date_optional_time
      gte: "now-1m"
      lte: "now"
      # Consider how fast events make it into Elasticsearch when you specify your time window here. Delay your window or overlap your window to account for these events that aren't there until they eventually are! This likely only impacts you if you are using a nowish mark.

alertTrigger: # The definition for the alert trigger. More on that later.
  type: threshold
  aggregation: count
  operator: gt
  value: 0
  # ^ alert when count of hits from query > 0

alert: # The definition for the alert. More on that later.
  type: email
  smtp:
    host: smtp.gmail.com
    port: 465
    secure: true

  to:
    - email1@gmail.com
    - email2@gmail.com
  from: auto@gmail.com

  title: '<%- hits.length %> SSHD Events Detected'
  # body will default to using a generic template that contains a table showing results

  tables:
    - summary: 'SSHD Event(s):'
      columns:
        - name: DateTime
          value: _source.@timestamp
          type: date
          format: '%m/%d/%Y%l:%M:%S.%L %p'
        - name: Host
          value: _source.agent.hostname
        - name: Event
          value: _source.sshd.eventname
        - name: User
          value: _source.sshd.username
        - name: Client Ip
          value: _source.client.ip
        - name: Client Region
          value: _source.client.geo.region_name
```
The example here represents a simplier example. This project allows you to fully customize every bit of the content of your alerts or emails.

# Alert Templating
Alert text provided in the rule definition is ran through [EJS](https://github.com/mde/ejs) and has the following properties and functions exposed:
| Name | Description |
|---|---|
| results | The raw hits and aggregations if applicable from Elasticsearch's response for the query. Exposed properties are `hits` and `aggregations`. Paged responses from Elasticsearch are combined into the one list of hits. |
| trigger | The instance of the trigger provided for the alert. Use this to access any applicable trigger state data. |

Individual other alert types may have additional properties exposed.

# ReAlert Options
| Name | Description |
|---|---|
| duration | Specifies to wait a specific amount of time. All sub properties are added together to get the total duration to wait. |
| duration.seconds | The total amount of seconds to wait. |
| duration.minutes | The total amount of minutes to wait. |
| duration.hours | The total amount of hours to wait. |
| duration.days | The total amount of days to wait. |

# Alert Trigger Definitions
## Threshold
| Name | Description | Required |
|---|---|---|
| aggregation | The type of aggregation used to get the value for the threshold.<br>`count`<br>`max`<br>`min`<br>`avg`<br>`sum`| Yes |
| operator | The operator used to compare the expected value and the actual value.<br>`eq`  Equal<br>`lt` Less Than<br>`gt` Greater Than<br>`lte` Less Than or Equal<br>`gte` Greater Than or Equal<br>`ne` Not Equal | Yes |
| value | The expected value to trigger the alert. | Yes |
| valuePath | The property path used to grab the individual values for the aggregation. Not required for `count` aggregation. | Yes |
| rowPath | The path to access the list of objects or values from the results property. Defaults to `hits`. |

This trigger also exposes the property `AggregatedValue` to templates which represents the resulting value from the given aggregation on the given property.

# Alert Definitions
## Email
| Name | Description | Required |
|---|---|---|
| smtp | Properties used to configure the email smtp connection. You can choose to place this setting in the general config file to use the same setting across all email alerts. | Yes |
| smtp.host | The host to connect to. | Yes |
| smtp.port | The port to connect to. | |
| smtp.secure | Whether or not to connect securely. | |
| smtp.user | The username to connect with. | Yes or authFile | |
| smtp.pass | The password to connect with. | Yes or authFile | |
| smtp.authFile | The yaml file that contains the user and pass properties. | Yes or user & pass |
| to | The list of emails addresses to send to. | Yes |
| from | The email address to set as the from address. | |
| title | The title text to use. Ran through ejs templating. | Yes |
| body | The text to use as the body. Ran through ejs templating. | |
| body.template | The file to use as a template for the body. Ran through ejs templating. A default template is used if none provided. | |
| summary | Text used before any table within the default email template used if none is provided. Rand through ejs templating. | |
| tables | Table definitions to render in the body of the email. | |
| tables[].limit | The count of rows to limit to. | |
| tables[].summary | A summary to show before the table. | |
| tables[].rowPath | The path to access the list of objects or values from the results property. This list is then used as the target for values extracted for the columns. Defaults to `hits`. | |
| tables[].columns | The definitions of columns to show. | |
| tables[].columns[].name | The text to render for the column header. | |
| tables[].columns[].valuePath | The property path used to extract the value from a row in the result set. | Yes |
| tables[].columns[].type | The property type. Used when formatting to help out. | |
| tables[].columns[].format | The format to use when rendering the value. See formatting below. | |
| tables[].columns[].unit | The unit of measure used in extracting the value for formatting. See formatting below. | |
| tables[].columns[].link | The url link to hyperlink to when clicked on. This text supports variable replacement for other property paths on the same row. Just place value paths within `{}` to have them replaced. | |
| links | A list of links to pass through to the body template. These items can be either strings containing the link to show or entries that have a link and text property to represent what the link should be and what the display text should be. | |

### Additional Template Properties
The following properties are available to templates for the body of the email:
| Name | Description |
|---|---|
| title | The title of the email being sent already ran through templating. |
| summary | Provided summary within the email alert definition already ran through templating. |
| links | Provided links within the email alert definition. |
| tables | Provided tables within the email alert definition. Each table will have the addition property named `rows` that contains all of the extracted and formatted values for each column. |
| tables[].rows | A list of rows that contains the cells for each column in the table. |
| tables[].rows[].column | The column definition for the cell. |
| tables[].rows[].data | The original object that the value of the cell comes from. |
| tables[].rows[].value | The formatted value given by the column definition's `valuePath`, `type`, and `format`. |

## Tiered
A unique alert type that allows you to nest other alert types to setup tiers that are cycled through during consecutive alerts. The current alert tier is reset to the first one once the alert's trigger conditions are no longer satisfied.

| Name | Description | Required |
|---|---|---|
| restart | A flag that indicates whether or not iterating through the tiers should start over once the last tier is hit. Defaults to false. | |
| tiers | A list of alert definitions that will be iterated through as long as the alert trigger conditions are met. | Yes |

# Supported data types and formats
When passing types and formats to the column entries of your tables, stick to javascript types and the following formats:
| Data Type | Formatter |
|---|---|
| Date | Formatter is [dayjs](https://github.com/iamkun/dayjs). |
| duration | Formatter is [dayjs](https://github.com/iamkun/dayjs). `unit` property is used here for duration parsing. |
| number | Formatter is [Numeral.js](https://github.com/adamwdraper/Numeral-js). |

# Docker Usage
A dockerfile is included to build an image.

An example of building the image:
```bash
$ npm run build-docker
```

An example of running the image:
```bash
$ docker run -it --rm -e TZ="America/Chicago" -e EA_CONFIG="/alerting/config.yml" -e EA_RULE="/alerting/rules" -v /path/on/host/to/config/and/rules:/alerting sluebbert/elasticsearch_alerter
```
