# linhtruong.vn on GitHub Pages

The DNS provider is Mat Bao (ns1.matbao.vn / ns2.matbao.vn).
The GitHub repository is unitemedia2010-oss/KOKO, published from main, root.

## Cutover

1. Set the GitHub Pages custom domain to `linhtruong.vn` before saving DNS.
   For this branch deployment, keep a root CNAME file containing that hostname.
2. In Mat Bao, open linhtruong.vn -> Ban ghi DNS. Inspect existing records.
   Update only conflicting website records at @ and www; preserve email
   records including MX, TXT/SPF/DKIM/DMARC and mail-related hostnames.
3. Set these website records, TTL 3600:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | unitemedia2010-oss.github.io |

The www target has no protocol and no /KOKO/ path. Do not change nameservers
or apply a whole-zone template. Inspect any existing apex AAAA records for
conflicting destinations before cutover.

4. Verify authoritative and public A/CNAME answers. GitHub notes propagation
   can take up to 24 hours.
5. Wait for GitHub's certificate to become available, then enable Enforce HTTPS.
6. Verify HTTPS, portrait/assets, both hero CTAs, www redirect and the old
   github.io URL. A successful Pages build alone does not establish DNS/TLS.

Source: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Rollback

Remove the custom domain setting/CNAME to return to the github.io URL, then
restore only the website DNS records from the pre-change snapshot if needed.
