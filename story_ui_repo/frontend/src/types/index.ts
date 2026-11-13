export type Genre = 
  | 'Horror'
  | 'Romance'
  | 'Fantasy'
  | 'Adventure'
  | 'Mystery'
  | 'Sci-Fi'
  | 'Comedy'
  | 'Drama'
  | 'Historical Fiction'
  | 'Custom';

export type Mood = 
  | 'Emotional'
  | 'Heartwarming'
  | 'Dark'
  | 'Suspenseful'
  | 'Magical'
  | 'Inspirational'
  | 'Funny'
  | 'Mysterious';

export interface OutlineItem {
  chapter: number;
  title: string;
  focus: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  genre: Genre;
  subgenre?: string;
  theme?: string;
  mood?: Mood;
  setting?: string;
  time_period?: string;
  character_count?: number;
  writing_style?: string;
  chapter_count?: number;
  ending_type?: string;
  plot_outline?: OutlineItem[];
  cover_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type ChapterStatus = 'draft' | 'in_review' | 'completed';

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  summary?: string;
  word_count?: number;
  status: ChapterStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CharacterRelationship {
  character_name: string;
  relation_type: string;
  notes?: string;
}

export interface Character {
  id: string;
  story_id: string;
  name: string;
  alias?: string;
  age?: string;
  role: string; // Protagonist, Antagonist, Foil, Companion, Mentor, etc.
  personality_traits: string[];
  backstory?: string;
  physical_description?: string;
  relationships: CharacterRelationship[];
  motivations?: string;
  goals?: string;
  fears?: string;
  secrets?: string;
  current_status: string; // Alive, Deceased, Missing, Unknown
  first_appearance?: string;
  last_appearance?: string;
  portrait_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type EventStatus = 'Completed' | 'Current' | 'Upcoming' | 'Locked' | 'Revised';
export type EventCategory = 'plot_turn' | 'conflict' | 'revelation' | 'discovery' | 'flashback' | 'important';

export interface TimelineEvent {
  id: string;
  story_id: string;
  event_number: number;
  title: string;
  description: string;
  illustration_url?: string;
  characters_involved: string[];
  location?: string;
  chapter_id?: string;
  chapter_number?: number;
  chronological_position: number;
  status: EventStatus;
  consequences: string[];
  category: EventCategory;
  created_at?: string;
  updated_at?: string;
}

export type MemoryCategory = 
  | 'character_facts'
  | 'locations'
  | 'relationships'
  | 'important_events'
  | 'objects'
  | 'world_rules'
  | 'history'
  | 'unresolved_mysteries'
  | 'story_specific';

export interface Memory {
  id: string;
  story_id: string;
  title: string;
  description: string;
  category: MemoryCategory;
  source_chapter: string;
  related_character?: string;
  related_location?: string;
  importance: 'High' | 'Medium' | 'Low';
  relevance_score?: number;
  created_at?: string;
  updated_at?: string;
}

export type PlotHoleSeverity = 'Critical' | 'Warning' | 'Suggestion';
export type PlotHoleCategory = 
  | 'character_inconsistency'
  | 'timeline_contradiction'
  | 'location_inconsistency'
  | 'object_continuity_error'
  | 'personality_inconsistency'
  | 'world_rule_violation'
  | 'relationship_inconsistency';

export interface PlotHole {
  id: string;
  story_id: string;
  title: string;
  category: PlotHoleCategory;
  severity: PlotHoleSeverity;
  description: string;
  previous_conflicting_info: string;
  current_conflicting_info: string;
  source_chapters: string[];
  suggested_correction: string;
  status: 'open' | 'resolved' | 'ignored';
  created_at?: string;
  updated_at?: string;
}

export interface CoWriterPayload {
  story_id: string;
  action: 'continue' | 'dialogue' | 'expand' | 'describe' | 'tone' | 'summarize' | 'continuity' | 'rewrite';
  content: string;
  chapter_title: string;
  character_notes?: string;
  instruction?: string;
}

export interface CoWriterResponse {
  generated_text: string;
  engine: string;
  injected_memories_count?: number;
  injected_memories?: Memory[];
}

export interface VectorPipelineExplanation {
  steps: {
    step: number;
    name: string;
    detail: string;
  }[];
  active_engine: string;
}
