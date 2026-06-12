export type SecretPattern = {
  name: string
  pattern: RegExp
}

export const repoSecretPatterns: SecretPattern[] = [
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9_-]{16,}/ },
  { name: 'OpenAI project key', pattern: /sk-proj-[A-Za-z0-9_-]{16,}/ },
  { name: 'Anthropic key', pattern: /sk-ant-[A-Za-z0-9_-]{16,}/ },
  { name: 'Claude Code key', pattern: /\bccsk-[A-Za-z0-9_-]{32,}\b/ },
  { name: 'Hugging Face token', pattern: /\bhf_[A-Za-z0-9]{20,}\b/ },
  { name: 'Stripe live secret key', pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: 'JWT-like key', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: 'Google API key', pattern: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
]

export const secretPatterns: SecretPattern[] = [
  ...repoSecretPatterns,
  { name: 'Postgres URL with password', pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'Supabase service role value', pattern: /service_role[^\n]{20,}/i },
]
