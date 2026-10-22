import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'vue/compiler-sfc';

type Node = { type: number; tag?: string; props?: { name: string; arg?: { content: string }; value?: { content: string } }[]; children?: Node[] };

const source = readFileSync(resolve(__dirname, '../../components/admin/lab-brands/AdminLabBrandFormModal.vue'), 'utf8');
const template = parse(source).descriptor.template!.ast as unknown as Node;

function find(node: Node, match: (n: Node) => boolean): Node | undefined {
  if (match(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, match);
    if (found) return found;
  }
  return undefined;
}

const slot = (name: string) => (n: Node) =>
  n.tag === 'template' && !!n.props?.some(p => p.name === 'slot' && p.arg?.content === name);
const attr = (n: Node, name: string) => n.props?.find(p => p.name === name)?.value?.content;

describe('AdminLabBrandFormModal', () => {
  // Le contenu du modal est rogné (overflow-hidden, max-h écran) : un bouton placé en bas d'un #content non défilant
  // devient inaccessible dès que la liste des labos rattachés s'allonge.
  it('place Enregistrer dans le pied fixe du modal, relié au formulaire du corps défilant', () => {
    const modal = find(template, n => n.tag === 'UModal')!;
    expect(find(modal, slot('content'))).toBeUndefined();

    const form = find(find(modal, slot('body'))!, n => n.tag === 'form')!;
    const formId = attr(form, 'id');
    expect(formId).toBeTruthy();

    const footer = find(modal, slot('footer'))!;
    const submit = find(footer, n => n.tag === 'UButton' && attr(n, 'type') === 'submit');
    expect(submit && attr(submit, 'form')).toBe(formId);
  });
});
