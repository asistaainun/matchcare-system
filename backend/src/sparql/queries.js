export const SPARQL_QUERIES = {
  // Get suitable products for skin type
  PRODUCTS_FOR_SKIN_TYPE: `
    PREFIX : <http://www.matchcare.com/ontology/skincare#>
    SELECT ?product ?productName ?rating ?price WHERE {
      ?product a :Product ;
               :suitableFor :{{skinType}} ;
               :hasName ?productName ;
               :hasRating ?rating ;
               :hasPrice ?price .
      FILTER(?rating > 3.5)
    }
    ORDER BY DESC(?rating)
    LIMIT 20
  `,
  
  // Get ingredient compatibility
  INGREDIENT_COMPATIBILITY: `
    PREFIX : <http://www.matchcare.com/ontology/skincare#>
    SELECT ?ingredient1 ?ingredient2 ?relationship WHERE {
      {
        ?ingredient1 :synergisticWith ?ingredient2 .
        BIND("synergistic" as ?relationship)
      } UNION {
        ?ingredient1 :incompatibleWith ?ingredient2 .
        BIND("incompatible" as ?relationship)
      }
      FILTER(?ingredient1 IN ({{ingredientList}}))
    }
  `,
  
  // Personalized recommendations
  PERSONALIZED_RECOMMENDATIONS: `
    PREFIX : <http://www.matchcare.com/ontology/skincare#>
    SELECT ?product ?score WHERE {
      ?product a :Product ;
               :suitableFor :{{skinType}} .
      ?product :treatsConcern ?concern .
      FILTER(?concern IN ({{concerns}}))
      
      # Calculate match score based on multiple factors
      BIND((
        (IF(?product :suitableFor :{{skinType}}, 0.4, 0)) +
        (COUNT(?concern) * 0.3) +
        (?product :hasRating / 5 * 0.3)
      ) as ?score)
    }
    ORDER BY DESC(?score)
  `
};