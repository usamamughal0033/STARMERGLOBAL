#!/usr/bin/env python3
"""Unify same-model machines: same SEW- model that is genuinely the SAME machine
gets one canonical name and unified (cosmetically-equal) spec values. Genuinely
different machines that share a model number are flagged, not merged. Genuinely
different VALUES on the same machine are flagged, not overwritten.

Dry-run by default; --apply writes data/catalog.json + js/catalog-data.js.
"""
import json, re, sys
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CJSON = ROOT / "data" / "catalog.json"
CJS = ROOT / "js" / "catalog-data.js"
APPLY = "--apply" in sys.argv

# targeted spelling fixes applied to spec values during unification
VAL_FIX = [
    (r"\bscat valve\b", "seat valve"),
    (r"\bsect valve\b", "seat valve"),
]

STOP = {"the", "a", "an", "of", "for", "with"}

def singular(t):
    if len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
        return t[:-1]
    return t

def name_tokens(n):
    toks = re.findall(r"[A-Za-z0-9]+", n.lower())
    return [singular(t) for t in toks if t not in STOP]

def tokset(n):
    return set(name_tokens(n))

FRAC = {"½": " 1/2", "¼": " 1/4", "¾": " 3/4", "�": " 1/2"}

def defrac(v):
    for a, b in FRAC.items():
        v = v.replace(a, b)
    return re.sub(r"\s{2,}", " ", v).strip()

def norm_val(v):
    """sorted-token fingerprint: equal => cosmetically the same value."""
    v = defrac(str(v))
    for pat, rep in VAL_FIX:
        v = re.sub(pat, rep, v, flags=re.I)
    # ignore axis-label parens for dimensions e.g. (H x W x L)
    core = re.sub(r"\([^)]*[lwhdLWHD][^)]*\)", "", v)
    toks = re.findall(r"[a-z0-9]+", core.lower())
    return frozenset(toks)

def apply_val_fix(v):
    v = defrac(v)
    for pat, rep in VAL_FIX:
        v = re.sub(pat, rep, v, flags=re.I)
    return v

def best_form(values):
    """choose the nicest original among cosmetically-equal values:
    most frequent, tie-break longest (keeps axis labels / fuller wording)."""
    cnt = Counter(values)
    return sorted(values, key=lambda s: (cnt[s], len(s)), reverse=True)[0]

def canonical_name(names):
    """names known to be the same machine -> one clear name.
    `names` may contain duplicates (used for frequency tie-break)."""
    freq = Counter(names)
    uniq = list(dict.fromkeys(names))
    if len(uniq) == 1:
        return uniq[0]
    sets = [tokset(n) for n in uniq]
    core = set.intersection(*sets)
    extras = [s - core for s in sets]
    nonempty = [e for e in extras if e]
    nested = all(a <= b or b <= a for a in nonempty for b in nonempty)
    # numeric qualifier (4 Stages / 5 Ton) that not every instance has -> use bare base
    extra_has_digit = any(any(ch.isdigit() for ch in t) for e in nonempty for t in e)
    if not nested or extra_has_digit:
        base = [n for n in uniq if tokset(n) == core]
        if base:
            return sorted(base, key=lambda n: (freq[n], -len(n)), reverse=True)[0]
        return re.sub(r"\s*\([^)]*\)", "", sorted(uniq, key=len)[0]).strip()
    # nested -> most descriptive (most tokens), tie-break frequency, then shorter (singular)
    return sorted(uniq, key=lambda n: (len(tokset(n)), freq[n], -len(n)), reverse=True)[0]

def same_pair(a, b):
    """are two names the same machine? share core nouns / one is a refinement."""
    sa, sb = tokset(a), tokset(b)
    core = sa & sb
    if not core:
        return False
    if sa <= sb or sb <= sa:
        return True
    # otherwise require a strong shared core (>=2 nouns covering most of each name)
    return len(core) >= 2 and min(len(core) / len(sa), len(core) / len(sb)) >= 0.6

def cluster_machines(machines):
    """union-find clustering of machines by name similarity."""
    n = len(machines)
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for i in range(n):
        for j in range(i + 1, n):
            if same_pair(machines[i]["name"], machines[j]["name"]):
                parent[find(i)] = find(j)
    clusters = defaultdict(list)
    for i in range(n):
        clusters[find(i)].append(machines[i])
    return list(clusters.values())


def main():
    d = json.load(open(CJSON, encoding="utf-8"))
    groups = defaultdict(list)
    for c in d["categories"]:
        for l in c["lines"]:
            for m in l["machines"]:
                model = m.get("model") or (m.get("specs") or {}).get("modelNumber")
                if model:
                    groups[model].append((c["id"], l["id"], m))

    collisions = []       # (model, [(cluster_name, [(cat,line,id)])])
    value_conflicts = []  # (model, name, key, {machineId: value})
    name_changes = 0
    spec_unified = 0
    spec_filled = 0

    def unify_cluster(model, machines):
        nonlocal name_changes, spec_unified, spec_filled
        names = [m["name"] for m in machines]
        canon = canonical_name(names)
        for m in machines:
            if m["name"] != canon:
                m["name"] = canon
                name_changes += 1
        allkeys = set()
        for m in machines:
            allkeys |= set((m.get("specs") or {}).keys())
        for k in allkeys:
            present = [(m, (m.get("specs") or {})[k]) for m in machines if k in (m.get("specs") or {})]
            fps = [norm_val(v) for _, v in present]
            uset = set(fps)
            # cosmetically equal, OR a verbose superset whose extra tokens are words (no digits)
            super_fp = max(uset, key=len)
            digits_in_extra = any(t for t in (super_fp - (set.intersection(*[set(f) for f in uset]) if uset else set())) if any(ch.isdigit() for ch in t))
            is_chain = all(set(f) <= set(super_fp) for f in uset)
            if len(uset) == 1 or (is_chain and not digits_in_extra):
                if len(uset) == 1:
                    canon_val = apply_val_fix(best_form([v for _, v in present]))
                else:
                    canon_val = apply_val_fix(best_form([v for (_, v), f in zip(present, fps) if f == super_fp]))
                for m, v in present:
                    if v != canon_val:
                        m["specs"][k] = canon_val
                        spec_unified += 1
                if len(present) * 2 >= len(machines):   # only fill if >=50% have it
                    for m in machines:
                        sp = m.setdefault("specs", {})
                        if k not in sp:
                            sp[k] = canon_val
                            spec_filled += 1
            else:
                value_conflicts.append((model, canon, k,
                                        {m["id"]: v for m, v in present}))

    for model, items in sorted(groups.items()):
        if len(items) < 2:
            continue
        machines = [m for _, _, m in items]
        idmap = {id(m): (c, l) for c, l, m in items}
        clusters = cluster_machines(machines)
        if len(clusters) > 1:
            # model shared by genuinely different machines -> flag
            entry = []
            for cl in clusters:
                cname = canonical_name([m["name"] for m in cl])
                entry.append((cname, [(idmap[id(m)][0], idmap[id(m)][1], m["id"]) for m in cl]))
            collisions.append((model, entry))
        # still unify within each cluster that is the same machine (>=2)
        for cl in clusters:
            if len(cl) >= 2:
                unify_cluster(model, cl)

    # reorder specs so filled keys keep modelNumber first-ish (optional, keep as-is)

    print("SAME-MACHINE UNIFICATION")
    print(f"  names rewritten      : {name_changes}")
    print(f"  spec values unified  : {spec_unified}")
    print(f"  missing specs filled : {spec_filled}")
    print()
    print(f"COLLISIONS (one model number on different machines) : {len(collisions)}  -- LEFT AS-IS, NEEDS NEW MODEL #s")
    for model, entry in collisions:
        print(f"  [{model}] used by {len(entry)} different machines:")
        for cname, locs in entry:
            ids = ", ".join(f"{c}/{i}" for c, l, i in locs)
            print(f"      \"{cname}\"  ->  {ids}")
    print()
    print(f"VALUE CONFLICTS (same machine, genuinely different values) : {len(value_conflicts)}  -- LEFT AS-IS, NEEDS YOUR REVIEW")
    cur = None
    for model, name, k, mp in value_conflicts:
        if model != cur:
            print(f"  [{model}] {name}")
            cur = model
        vals = " | ".join(f"{mid}={v!r}" for mid, v in mp.items())
        print(f"      {k}: {vals}")

    if APPLY:
        out = json.dumps(d, ensure_ascii=False, indent=2)
        CJSON.write_text(out + "\n", encoding="utf-8")
        CJS.write_text("window.CATALOG_DATA = " + out + ";\n", encoding="utf-8")
        print("\nAPPLIED -> wrote catalog.json and catalog-data.js")
    else:
        print("\nDRY RUN (no files written). Re-run with --apply to write.")

if __name__ == "__main__":
    main()
