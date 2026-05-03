# RTC Reward Action

Automatically award [RustChain](https://github.com/Scottcjn/Rustchain) RTC tokens when a pull request is merged. Turn any GitHub repo into a bounty platform with just one YAML file.

## Features

- 🎯 **Auto-reward** — RTC tokens sent automatically on PR merge
- 💰 **Configurable** — Set any amount per merge
- 🔍 **Wallet detection** — Reads contributor wallet from PR body or `.rtc-wallet` file
- 💬 **PR comments** — Posts confirmation comment with TX details
- 🧪 **Dry-run mode** — Test without actual transfers
- 🛡️ **Secure** — Admin key passed via GitHub Secrets

## Usage

Add this to `.github/workflows/rtc-reward.yml`:

```yaml
name: RTC Reward
on:
  pull_request:
    types: [closed]

jobs:
  reward:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: lwl2005/rtc-reward-action@v1
        with:
          node-url: https://50.28.86.131
          amount: 5
          wallet-from: project-fund
          admin-key: ${{ secrets.RTC_ADMIN_KEY }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `node-url` | No | `https://50.28.86.131` | RustChain node URL |
| `amount` | Yes | `5` | RTC amount to award per merge |
| `wallet-from` | Yes | - | Source wallet name for funding |
| `admin-key` | Yes | - | Admin key for signing transfers |
| `wallet-path` | No | `.rtc-wallet` | Path to contributor wallet file |
| `dry-run` | No | `false` | Run without actual transfers |

## Outputs

| Output | Description |
|--------|-------------|
| `wallet` | Contributor wallet that received the reward |
| `amount` | Amount of RTC awarded |
| `tx-id` | Transaction ID of the transfer |

## How It Works

1. **PR merged** → Action triggers
2. **Extract wallet** → From PR body (look for `Wallet: RTC...`) or `.rtc-wallet` file
3. **Check node** → Verify RustChain node is healthy
4. **Transfer RTC** → Send reward from project wallet to contributor
5. **Comment** → Post confirmation on the PR

## Contributor Wallet Format

Contributors can specify their wallet in the PR body:

```markdown
**Wallet:** `RTC24f319a3dc4ecda8927b59af074d05d8350159d0`
```

Or create a `.rtc-wallet` file in the repo root with just the wallet address.

## Setup

1. **Create a project wallet** on RustChain
2. **Fund it** with RTC tokens
3. **Set `RTC_ADMIN_KEY`** as a GitHub repository secret
4. **Add the workflow file** above

## Example PR Comment

When a reward is sent, the action posts:

> 🎉 **RTC Reward Sent!**
>
> | Field | Value |
> |-------|-------|
> | Wallet | `RTC24f319a3dc4ecda8927b59af074d05d8350159d0` |
> | Amount | 5 RTC |
> | TX ID | abc123 |
> | Node | https://50.28.86.131 |
>
> Thank you for your contribution! 🚀

## Keywords

GitHub Action, GitHub Marketplace, automated crypto rewards, contributor incentives, open source bounty, CI/CD cryptocurrency, RTC token, pull request rewards, developer incentives, pay contributors crypto, RustChain
