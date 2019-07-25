# Tempo Tools

Tools for interacting with Tempo for management & reporting

## Concept
We wanted a way to monitor hours billed against how many hours a client has purchased, provide notifications when a threshold has been reached, and allow Account Managers to update the budget with more hours, should a client choose to purshase more.

We've decided to use Slack for notifications when the threshold for hours has been reached, and as a mechanism for updating the budget of hours that have been purchased.

Account Managers should be able to interact with Slack to get a current report and reconcile an account by updating the monthly budget against the total number of hours that have been purchased.

Backing all of this is a Google Sheet that will allow Account Managers and Gun.io staff to see all accounts and manage total hours purchased & monthly budget basis.

First Alert
50%

A little more naggy
25%

Daily notification
10%

Every time it runs
0% or negative

--------------

Notifications should based off the total budget


-----

Start total hours from Jan 1 2019

slack notification Mon/Friday report to post to slack channel - balance / hours remaining
slack notification for threshold alerts

slack command for instant report on balance / hours remaining

slack command for CSV dump
slack command to get PDF tempo report

slack command to get PDF tempo report by Account & Date Range User -> Issue -> Worklog
 * Restrict by [gun.io full members - no multi/single channel guests]
 * Contrain to DM or managment channel
