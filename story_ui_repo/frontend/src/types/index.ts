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

export interface Page {
  id: string;
  chapter_id: string;
  page_number: number;
  content: string;
  word_count: number;
  save_status?: 'saved' | 'saving' | 'unsaved' | 'error';
  created_at?: string;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  summary?: string;
  word_count?: number;
  status: ChapterStatus;
  pages?: Page[];
  created_at?: string;
  updated_at?: string;
}

export interface CharacterRelationship {
  character_name: string;
  relation_type: string;
  notes?: string;
}

export type InvestigationStatus = 'innocent' | 'person_of_interest' | 'unclassified';

export interface Character {
  id: string;
  story_id: string;
  name: string;
  alias?: string;
  age?: string;
  gender?: string;
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
  character_arc?: string;
  investigation_status?: InvestigationStatus;
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

export type PlotHoleSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Warning' | 'Suggestion';
export type PlotHoleCategory = 
  | 'character_inconsistency'
  | 'timeline_contradiction'
  | 'missing_object'
  | 'location_conflict'
  | 'location_inconsistency'
  | 'object_continuity_error'
  | 'personality_inconsistency'
  | 'forgotten_storyline'
  | 'world_rule_violation'
  | 'relationship_inconsistency'
  | 'unexplained_appearance'
  | 'unresolved_clue'
  | 'contradictory_dialogue'
  | 'universe_memory_contradiction';

export type PlotHoleStatus = 'open' | 'under_review' | 'resolved' | 'ignored' | 'dismissed';

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
  continuity_impact?: string;
  related_elements?: string[];
  related_element_ids?: string[];
  status: PlotHoleStatus;
  created_at?: string;
  updated_at?: string;
}

export type BoardElementType = 'character' | 'location' | 'event' | 'evidence' | 'clue' | 'personality' | 'world_rule';
export type CardColorTheme = 'polaroid' | 'aged' | 'manila' | 'yellow' | 'pink' | 'green' | 'blue' | 'red';
export type CardStatusBadge = 'verified' | 'unverified' | 'suspect' | 'alive' | 'deceased' | 'missing' | 'open';

export interface BoardCardPosition {
  x: number;
  y: number;
}

export interface InvestigationCard {
  id: string;
  story_id: string;
  type: BoardElementType;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  status?: CardStatusBadge | string;
  is_culprit?: boolean;
  is_pinned?: boolean;
  color?: CardColorTheme | string;
  position: BoardCardPosition;
  size?: { width?: number; height?: number };
  metadata?: Record<string, any>;
  has_issue?: boolean;
  issue_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface InvestigationConnection {
  id: string;
  source_id: string;
  target_id: string;
  label?: string;
  type?: 'suspect' | 'contradiction' | 'timeline' | 'location' | 'evidence' | 'relation' | 'custom' | string;
  notes?: string;
  is_contradiction?: boolean;
  issue_id?: string;
  created_at?: string;
}

export interface InvestigationBoardState {
  story_id: string;
  elements: InvestigationCard[];
  connections: InvestigationConnection[];
  culprit_id?: string | null;
  zoom?: number;
  pan_offset?: { x: number; y: number };
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
