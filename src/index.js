const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');

async function getNodeHealth(nodeUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL('/health', nodeUrl);
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ status: data });
        }
      });
    }).on('error', reject);
  });
}

async function getBalance(nodeUrl, walletId) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/balance/${walletId}`, nodeUrl);
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse balance response: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function transferRtc(nodeUrl, fromWallet, toWallet, amount, adminKey) {
  return new Promise((resolve, reject) => {
    const url = new URL('/wallet/transfer', nodeUrl);
    const postData = JSON.stringify({
      from: fromWallet,
      to: toWallet,
      amount: parseFloat(amount),
      admin_key: adminKey
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function extractWalletFromBody(prBody) {
  if (!prBody) return null;

  // Look for wallet patterns
  const patterns = [
    /[Ww]allet[:\s]*`?(RTC[a-f0-9]{40})`?/,
    /RTC[a-f0-9]{40}/,
    /[Ww]allet[:\s]*`?([a-zA-Z0-9_-]+)`?/
  ];

  for (const pattern of patterns) {
    const match = prBody.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return null;
}

function extractWalletFromFile(repo, prNumber, walletPath, octokit) {
  // This would need to check the repo for .rtc-wallet file
  // For now, return null - implement with octokit if needed
  return null;
}

async function run() {
  try {
    const nodeUrl = core.getInput('node-url') || 'https://50.28.86.131';
    const amount = core.getInput('amount') || '5';
    const walletFrom = core.getInput('wallet-from');
    const adminKey = core.getInput('admin-key');
    const walletPath = core.getInput('wallet-path') || '.rtc-wallet';
    const dryRun = core.getInput('dry-run') === 'true';

    const context = github.context;
    const pr = context.payload.pull_request;

    if (!pr) {
      core.setFailed('This action only works on pull_request events');
      return;
    }

    if (!pr.merged) {
      core.info('PR was not merged, skipping reward');
      return;
    }

    core.info(`PR #${pr.number} merged! Processing reward...`);

    // Check node health
    try {
      const health = await getNodeHealth(nodeUrl);
      core.info(`Node health: ${JSON.stringify(health)}`);
    } catch (e) {
      core.warning(`Node health check failed: ${e.message}`);
    }

    // Extract contributor wallet from PR body
    let contributorWallet = extractWalletFromBody(pr.body);

    if (!contributorWallet) {
      // Try to get from PR author's profile or .rtc-wallet file
      contributorWallet = pr.user.login;
      core.info(`No wallet found in PR body, using PR author: ${contributorWallet}`);
    }

    core.info(`Contributor wallet: ${contributorWallet}`);
    core.info(`Reward amount: ${amount} RTC`);
    core.info(`Source wallet: ${walletFrom}`);

    if (dryRun) {
      core.info('[DRY RUN] Would transfer RTC, skipping actual transfer');
      core.setOutput('wallet', contributorWallet);
      core.setOutput('amount', amount);
      core.setOutput('tx-id', 'dry-run');
      return;
    }

    // Transfer RTC
    try {
      const result = await transferRtc(nodeUrl, walletFrom, contributorWallet, amount, adminKey);
      core.info(`Transfer result: ${JSON.stringify(result)}`);

      if (result.ok === false) {
        core.setFailed(`Transfer failed: ${result.error || JSON.stringify(result)}`);
        return;
      }

      core.setOutput('wallet', contributorWallet);
      core.setOutput('amount', amount);
      core.setOutput('tx-id', result.tx_id || result.id || 'unknown');

      // Post comment on PR
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        const octokit = github.getOctokit(token);
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: pr.number,
          body: `🎉 **RTC Reward Sent!**\n\n` +
                `| Field | Value |\n` +
                `|-------|-------|\n` +
                `| Wallet | \`${contributorWallet}\` |\n` +
                `| Amount | ${amount} RTC |\n` +
                `| TX ID | ${result.tx_id || result.id || 'N/A'} |\n` +
                `| Node | ${nodeUrl} |\n\n` +
                `Thank you for your contribution! 🚀`
        });
        core.info('Comment posted on PR');
      }

    } catch (e) {
      core.setFailed(`Transfer error: ${e.message}`);
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
