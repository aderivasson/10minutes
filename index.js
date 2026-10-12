const nicolasRules = require('./nicolas.js');
const morozovRules = require('./morozov.js');
const negotiationRules = require('./negotiation.js');
const evaGround = require('./eva-ground.js');

const scenarios = {
  eva_ground: { id:'eva_ground', rules:'EVA Ground uses deterministic server-side world state.', dossierItems:{}, evaHandler:evaGround.handleTurn },
  investigation: {
    id: 'investigation',
    rules: nicolasRules,
    dossierItems: {
      marc_victim: {
        title: 'MARC LAURENT · VICTIME',
        content: 'Retrouvé mort dans son appartement situé 18 rue des Tilleuls, Paris 11e, vers 17h00. Heure exacte de la mort inconnue. Mort par arme blanche. Signes de lutte. Arme introuvable.'
      },
      emilie_statement: {
        title: 'DÉPOSITION · ÉMILIE LAURENT',
        content: 'Elle déclare s’être disputée avec Marc, être partie en début d’après-midi chez Sophie Bernard, puis avoir découvert Marc mort à son retour.'
      },
      sophie_statement: {
        title: 'DÉPOSITION · SOPHIE BERNARD',
        content: 'Confirme la visite d’Émilie sans pouvoir préciser son heure d’arrivée. Émilie lui avait parlé de comportements violents de Marc et disait pouvoir compter sur Nicolas quand ça allait mal.'
      },
      camera_tilleuls: {
        title: 'VIDÉOSURVEILLANCE · RUE DES TILLEULS',
        content: 'Caméra située à proximité du 18 rue des Tilleuls, Paris 11e. 14:30 — Nicolas se déplace vers le n°18. 16:10 — Nicolas s’éloigne du n°18.',
        canonicalContent: 'La pièce montre deux captures de la même caméra située à proximité du 18 rue des Tilleuls, Paris 11e. Nicolas est identifié avec certitude sur les deux captures. À 14:30, Nicolas se déplace vers le n°18 ; il porte une chemise blanche et un jean, sans sac visible. À 16:10, Nicolas s’éloigne du n°18 ; il porte une chemise bleu marine et le même jean, avec un sac visible. La pièce n’établit pas son point de départ exact, sa destination exacte, le contenu du sac, ni ce qui s’est produit entre les deux captures.'
      },
      dna_colin: {
        title: 'ANALYSES BIOLOGIQUES',
        content: 'Des traces biologiques retrouvées dans l’appartement des Laurent sont attribuables à Nicolas Colin. Leur ancienneté ne peut pas être déterminée.'
      },
      nicolas_statement: {
        title: 'DÉPOSITION INITIALE · NICOLAS COLIN',
        content: '« Je connaissais les Laurent comme des voisins. On discutait parfois dans l’immeuble, rien de plus. J’étais chez moi une bonne partie de l’après-midi. Je suis sorti un moment, puis je suis rentré. Je n’ai rien vu ni entendu d’inhabituel. »'
      }
    }
  },
  espionage: {
    id: 'espionage',
    rules: morozovRules,
    dossierItems: {
      situation: {
        title: 'SITUATION',
        content: 'Opération militaire russe imminente contre un pays européen membre de l’OTAN. Déclenchement prévu dans environ 48 heures. Pays visé inconnu.'
      },
      morozov_profile: {
        title: 'PROFIL · MOROZOV',
        content: 'Officier supérieur du SVR, les services de renseignement russes. Spécialiste de la France. Joueur de poker régulier, il n’hésite pas à miser de grosses sommes. Relation durable avec Julien Mercier. Morozov pense que Moscou sous-estime jusqu’où la France est prête à aller en cas d’attaque contre ses intérêts.'
      },
      orphee: {
        title: 'ORPHÉE · MIKHAÏL SOKOLOV',
        content: 'Assistant de Morozov à Paris et source DGSE. Il établit que Morozov est directement lié à l’opération et dispose d’informations auxquelles lui-même n’a pas accès. ORPHÉE ignore le pays visé.'
      },
      mercier: {
        title: 'ÉCOUTES MERCIER',
        content: 'Julien Mercier est marchand d’art. La DGSE écoute à son insu les conversations privées de Mercier avec Morozov. À propos de ses supérieurs : « Ils sont complètement cons. » · « Pars de France, Julien. Tu as deux jours. Après, ça va chauffer. »'
      },
      fas: {
        title: 'SECRET FRANÇAIS · FAS',
        content: 'Face à la menace russe contre un pays européen, la France est passée en alerte nucléaire. Moscou est présumé l’ignorer.'
      }
    }
  },
  negotiation: {
    id: 'negotiation',
    rules: negotiationRules,
    dossierItems: {
      claire_morel: {
        title: 'CLAIRE MOREL',
        content: '48 ans · Juge d’instruction. Juge d’instruction chargée de l’enquête sur la mort de Julien Delmas. A rendu une ordonnance de non-lieu à l’égard du principal suspect, faute de preuves suffisantes. Divorcée. Mère de deux enfants.'
      },
      julien_delmas: {
        title: 'JULIEN DELMAS',
        content: 'Julien Delmas, le fils de Bernard, a été assassiné. Un suspect a été mis en cause. Claire Morel, juge d’instruction chargée de l’affaire, a finalement rendu un non-lieu faute de preuves suffisantes. Bernard reste convaincu de la culpabilité de cet homme et exige la réouverture de l’enquête.'
      },
      bernard_service: {
        title: 'PARCOURS MILITAIRE',
        content: 'Bernard Delmas. Ancien militaire spécialisé dans le déminage. A participé à des opérations de déminage dans les Balkans dans les années 1990.'
      },
      engin_improvise: {
        title: 'ENGIN IMPROVISÉ',
        content: 'Analyse des démineurs : le dispositif porté par Bernard Delmas est potentiellement opérationnel. Sa conception exacte ne peut être déterminée à partir des images disponibles. STABILITÉ INCONNUE.'
      },
      anne_message: {
        title: 'MESSAGE D’ANNE DELMAS',
        content: 'Message audio authentique transmis par Anne Delmas aux forces de l’ordre pour Bernard.',
        canonicalContent: 'Anne Delmas a authentiquement transmis aux forces de l’ordre ce message destiné à Bernard : « Bernard, j’ai déjà perdu mon fils. Je ne peux pas perdre aussi mon mari ! Tu ne peux pas me faire ça ! » Le FILE certifie uniquement ce message et son authenticité ; il ne certifie aucune autre information sur le ton, l’état émotionnel, l’environnement sonore ou la situation d’Anne.'
      },
      unite_intervention: {
        title: 'UNITÉ D’INTERVENTION',
        content: 'Une unité du GIGN et des démineurs sont déployés autour du palais de justice. Ils se tiennent prêts à intervenir sur ordre ou si la situation dégénère.'
      }
    }
  },
};

function getScenario(id) {
  return scenarios[id] || null;
}

module.exports = { getScenario };
