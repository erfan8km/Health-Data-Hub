import countryData from "@/data/countries.json";
import cityData from "@/data/cities.json";
import institutionData from "@/data/institutions.json";
import categoryData from "@/data/categories.json";
import fieldData from "@/data/fields.json";
import registryData from "@/data/registries.json";

export interface LookupItem {
  id: string;
  name_fa: string;
  name_en: string;
}

export interface Country extends LookupItem {}
export interface City extends LookupItem {
  country_id: string;
}
export interface Institution extends LookupItem {
  city_id: string;
}
export interface Category extends LookupItem {
  description_fa: string;
  description_en: string;
}
export interface Field extends LookupItem {
  category_id: string;
}
export interface Registry {
  id: string;
  title_fa: string;
  title_en: string;
  description_fa: string;
  description_en: string;
  category_id: string;
  field_id: string;
  institution_id: string;
  official_source_url: string;
  status: "active" | "inactive";
  last_checked: string;
  source_text_fa: string;
  source_text_en: string;
  geographic_text_fa: string;
  geographic_text_en: string;
}

export const countries = countryData as Country[];
export const cities = cityData as City[];
export const institutions = institutionData as Institution[];
export const categories = categoryData as Category[];
export const fields = fieldData as Field[];
export const registries = registryData as Registry[];
